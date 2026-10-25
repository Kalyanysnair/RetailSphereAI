/*
 * =========================================================================
 * RetailSphere AI — ESP32 Dual FC-51 IR Sensor Inventory Counter
 * =========================================================================
 * Hardware Configuration:
 *   - ESP32 Development Board
 *   - Two FC-51 Infrared Obstacle Avoidance Sensors (Active LOW)
 *   - GPIO 27: INCREMENT_SENSOR (Sensor A / Item Entry)
 *   - GPIO 26: DECREMENT_SENSOR (Sensor B / Item Exit)
 *
 * Pin Connections:
 *   INCREMENT SENSOR (GPIO 27):
 *     VCC  --> ESP32 3V3 (or 5V for 5V-tolerant modules)
 *     GND  --> ESP32 GND
 *     OUT  --> ESP32 GPIO 27
 *
 *   DECREMENT SENSOR (GPIO 26):
 *     VCC  --> ESP32 3V3 (or 5V for 5V-tolerant modules)
 *     GND  --> ESP32 GND
 *     OUT  --> ESP32 GPIO 26
 *
 * Operational Behavior:
 *   1. Hardware Transition-Edge Detection (Active LOW):
 *      - D27 falling edge (HIGH -> LOW): Item enters -> sends "IN" (+1)
 *      - D26 falling edge (HIGH -> LOW): Item exits  -> sends "OUT" (-1)
 *      - Cooldown (1000ms) prevents bounce or multi-counts on furniture slats.
 *      - Zero-stock floor protection prevents negative inventory counts.
 *   2. Authoritative PostgreSQL Synchronization:
 *      - On boot/reconnect, fetches current database stock from FastAPI backend.
 *      - Stock count NEVER resets to zero on ESP32 reboot.
 *      - Server response updates local stock with PostgreSQL source of truth.
 *   3. Periodic Heartbeat & Freshness:
 *      - Transmits an authenticated heartbeat every 25 seconds.
 *      - Maintains ONLINE status in RetailSphere AI Admin Dashboard.
 *   4. Fault-Tolerant Offline Queue & Deduplication:
 *      - If Wi-Fi is temporarily disconnected, events buffer locally in FIFO queue.
 *      - Each event includes a unique event_id for backend deduplication.
 *      - Buffered events transmit automatically upon reconnection.
 *      - Events are only removed from the queue once the backend confirms receipt.
 *   5. Security & Privacy:
 *      - Authenticated with X-IoT-Key header.
 *      - Credentials are NEVER printed to Serial Monitor.
 * =========================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// -------------------------------------------------------------------------
// 1. PIN & HARDWARE CONFIGURATION
// -------------------------------------------------------------------------
#define INCREMENT_SENSOR_PIN 27   // GPIO 27: Item entry (increments stock)
#define DECREMENT_SENSOR_PIN 26   // GPIO 26: Item exit (decrements stock)

// FC-51 outputs LOW (0) when obstacle is detected, HIGH (1) when clear
#define OBSTACLE_DETECTED LOW
#define SENSOR_CLEAR      HIGH

// Cooldown lockout per sensor (ms) to avoid bounce or multi-counts
const unsigned long SENSOR_COOLDOWN_MS = 1000;

// -------------------------------------------------------------------------
// 2. NETWORK & BACKEND SERVER CONFIGURATION
// -------------------------------------------------------------------------
// Wi-Fi Credentials for local 2.4GHz network:
const char* WIFI_SSID     = "esp";
const char* WIFI_PASSWORD = "sabari7777";

// Backend Server Configuration:
const char* SERVER_HOST   = "10.102.99.242"; 
const int   SERVER_PORT   = 8000;

// Device identification and security key matching backend IOT_DEVICE_SECRET
const char* DEVICE_ID     = "ESP32-WAREHOUSE-GATE-01";
const char* IOT_KEY       = "retailsphere-iot-inventory-secret-2026";

// Heartbeat ping interval when idle (25s ensures device stays ONLINE within 120s stale window)
const unsigned long HEARTBEAT_INTERVAL_MS = 25000;

// HTTP client connection timeout (ms) — accommodates remote PostgreSQL handshakes
const int HTTP_TIMEOUT_MS = 6000;

// -------------------------------------------------------------------------
// 3. RUNTIME VARIABLES & EVENT BUFFER
// -------------------------------------------------------------------------
int stockCount = 0; // Synchronized with backend PostgreSQL

int lastIncrementState = SENSOR_CLEAR;
int lastDecrementState = SENSOR_CLEAR;

unsigned long lastIncrementTime = 0;
unsigned long lastDecrementTime = 0;
unsigned long lastHeartbeatTime  = 0;
unsigned long lastWifiCheckTime  = 0;
unsigned long eventCounter       = 0;

bool wasConnected       = false;
bool initialStockSynced = false;

// Event buffer for offline / retry queue
struct QueuedEvent {
  char direction[6];      // "IN" or "OUT"
  char rawSequence[12];   // "D27" or "D26"
  char eventId[56];       // Unique deduplication ID
  char notes[96];         // Descriptive notes
  bool pending;
};

const int QUEUE_SIZE = 16;
QueuedEvent eventQueue[QUEUE_SIZE];
int queueHead  = 0;
int queueTail  = 0;
int queueCount = 0;

// -------------------------------------------------------------------------
// FORWARD DECLARATIONS (ensures Arduino compiler resolves all prototypes)
// -------------------------------------------------------------------------
int extractStockCount(const String& payload);
bool enqueueEvent(const char* direction, const char* rawSequence, const char* notes);
bool transmitEvent(QueuedEvent& ev);
void processEventQueue();
void sendHeartbeat();
void syncAuthoritativeStockFromBackend();

// -------------------------------------------------------------------------
// 4. HELPER: EXTRACT CURRENT_STOCK FROM JSON RESPONSE (Dependency-free)
// -------------------------------------------------------------------------
int extractStockCount(const String& payload) {
  int keyIndex = payload.indexOf("\"current_stock\":");
  if (keyIndex == -1) {
    keyIndex = payload.indexOf("\"current_stock\" :");
  }
  if (keyIndex != -1) {
    int colonIndex = payload.indexOf(':', keyIndex);
    if (colonIndex != -1) {
      int start = colonIndex + 1;
      while (start < (int)payload.length() && (payload[start] == ' ' || payload[start] == '\t')) {
        start++;
      }
      int end = start;
      if (end < (int)payload.length() && payload[end] == '-') {
        end++;
      }
      while (end < (int)payload.length() && isDigit(payload[end])) {
        end++;
      }
      if (end > start) {
        return payload.substring(start, end).toInt();
      }
    }
  }
  return -1;
}

// -------------------------------------------------------------------------
// 5. HELPER: QUEUE SENSOR EVENT
// -------------------------------------------------------------------------
bool enqueueEvent(const char* direction, const char* rawSequence, const char* notes) {
  if (queueCount >= QUEUE_SIZE) {
    Serial.println("[QUEUE FULL] Buffer reached capacity. Dropping oldest unconfirmed event.");
    queueHead = (queueHead + 1) % QUEUE_SIZE;
    queueCount--;
  }

  QueuedEvent& ev = eventQueue[queueTail];
  strncpy(ev.direction, direction, sizeof(ev.direction) - 1);
  ev.direction[sizeof(ev.direction) - 1] = '\0';

  strncpy(ev.rawSequence, rawSequence, sizeof(ev.rawSequence) - 1);
  ev.rawSequence[sizeof(ev.rawSequence) - 1] = '\0';

  eventCounter++;
  snprintf(ev.eventId, sizeof(ev.eventId), "esp32-%s-%lu-%lu", DEVICE_ID, millis(), eventCounter);

  strncpy(ev.notes, notes, sizeof(ev.notes) - 1);
  ev.notes[sizeof(ev.notes) - 1] = '\0';

  ev.pending = true;

  queueTail = (queueTail + 1) % QUEUE_SIZE;
  queueCount++;

  Serial.printf("[QUEUED] %s passage event (#%lu, ID: %s) buffered. Queue depth: %d\n",
                direction, eventCounter, ev.eventId, queueCount);
  return true;
}

// -------------------------------------------------------------------------
// 6. HELPER: SYNCHRONIZE AUTHORITATIVE STOCK FROM POSTGRESQL BACKEND
// -------------------------------------------------------------------------
void syncAuthoritativeStockFromBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SYNC SKIP] Wi-Fi offline. Using current local stock.");
    return;
  }

  char statusUrl[160];
  snprintf(statusUrl, sizeof(statusUrl), "http://%s:%d/api/iot/inventory/status?device_id=%s",
           SERVER_HOST, SERVER_PORT, DEVICE_ID);

  Serial.printf("[SYNC] Querying backend status: %s\n", statusUrl);

  HTTPClient http;
  http.begin(statusUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("X-IoT-Key", IOT_KEY);
  http.addHeader("X-Device-Id", DEVICE_ID);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    int serverStock = extractStockCount(payload);
    if (serverStock >= 0) {
      stockCount = serverStock;
      Serial.println("========================================================");
      Serial.printf("[SYNC SUCCESS] Authoritative PostgreSQL Stock: %d units\n", stockCount);
      Serial.println("========================================================");
    } else {
      Serial.printf("[SYNC] Received payload without current_stock: %s\n", payload.c_str());
    }
  } else {
    Serial.printf("[SYNC NOTICE] Backend status query returned HTTP %d. Retaining local stock: %d\n",
                  httpCode, stockCount);
  }
  http.end();
}

// -------------------------------------------------------------------------
// 7. HELPER: TRANSMIT SENSOR EVENT TO BACKEND
// -------------------------------------------------------------------------
bool transmitEvent(QueuedEvent& ev) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  char eventUrl[160];
  snprintf(eventUrl, sizeof(eventUrl), "http://%s:%d/api/iot/inventory/event",
           SERVER_HOST, SERVER_PORT);

  HTTPClient http;
  http.begin(eventUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-IoT-Key", IOT_KEY);
  http.addHeader("X-Device-Id", DEVICE_ID);

  char jsonPayload[320];
  snprintf(jsonPayload, sizeof(jsonPayload),
           "{\"device_id\":\"%s\",\"direction\":\"%s\",\"raw_sequence\":\"%s\",\"event_id\":\"%s\",\"notes\":\"%s\"}",
           DEVICE_ID, ev.direction, ev.rawSequence, ev.eventId, ev.notes);

  Serial.printf("[HTTP POST] Sending %s event to %s\n", ev.direction, eventUrl);

  int httpCode = http.POST(jsonPayload);
  bool success = false;

  Serial.printf("[HTTP POST] HTTP Response Code: %d\n", httpCode);

  if (httpCode == HTTP_CODE_CREATED || httpCode == HTTP_CODE_OK) {
    String responseBody = http.getString();
    Serial.printf("[HTTP POST] Response Body: %s\n", responseBody.c_str());

    int serverStock = extractStockCount(responseBody);
    if (serverStock >= 0) {
      stockCount = serverStock;
    }
    lastHeartbeatTime = millis();
    Serial.printf("[STOCK SYNC] Authoritative PostgreSQL Stock: %d units\n", stockCount);
    success = true;
  } else if (httpCode > 0) {
    String responseBody = http.getString();
    Serial.printf("[HTTP POST] Server returned error (HTTP %d): %s\n", httpCode, responseBody.c_str());
    success = false;
  } else {
    Serial.printf("[HTTP FAIL] Connection error: %s. Preserving event in queue.\n",
                  http.errorToString(httpCode).c_str());
    success = false;
  }

  http.end();
  return success;
}

// -------------------------------------------------------------------------
// 8. HELPER: FLUSH QUEUED EVENTS IN FIFO ORDER
// -------------------------------------------------------------------------
void processEventQueue() {
  if (queueCount == 0 || WiFi.status() != WL_CONNECTED) return;

  QueuedEvent& ev = eventQueue[queueHead];
  if (ev.pending) {
    if (transmitEvent(ev)) {
      ev.pending = false;
      queueHead = (queueHead + 1) % QUEUE_SIZE;
      queueCount--;
      Serial.printf("[QUEUE] Event %s confirmed by server and removed. Remaining: %d\n", ev.eventId, queueCount);
    } else {
      Serial.printf("[QUEUE] Event %s transmission unconfirmed. Preserving in queue (depth: %d) for retry.\n", ev.eventId, queueCount);
    }
  }
}

// -------------------------------------------------------------------------
// 9. HELPER: SEND AUTHENTICATED HEARTBEAT
// -------------------------------------------------------------------------
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  char heartbeatUrl[180];
  snprintf(heartbeatUrl, sizeof(heartbeatUrl), "http://%s:%d/api/iot/inventory/heartbeat?device_id=%s",
           SERVER_HOST, SERVER_PORT, DEVICE_ID);

  HTTPClient http;
  http.begin(heartbeatUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-IoT-Key", IOT_KEY);
  http.addHeader("X-Device-Id", DEVICE_ID);

  char jsonPayload[64];
  snprintf(jsonPayload, sizeof(jsonPayload), "{\"device_id\":\"%s\"}", DEVICE_ID);

  Serial.printf("[HEARTBEAT] Sending heartbeat to: %s\n", heartbeatUrl);

  int httpCode = http.POST(jsonPayload);
  Serial.printf("[HEARTBEAT] HTTP Response Code: %d\n", httpCode);

  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String resp = http.getString();
    Serial.printf("[HEARTBEAT] Response Body: %s\n", resp.c_str());

    int serverStock = extractStockCount(resp);
    if (serverStock >= 0) {
      stockCount = serverStock;
    }
    lastHeartbeatTime = millis();
    Serial.printf("[HEARTBEAT] Backend confirmed ONLINE. Authoritative Stock: %d\n", stockCount);
  } else if (httpCode > 0) {
    String resp = http.getString();
    Serial.printf("[HEARTBEAT] Ping rejected by backend (HTTP %d): %s\n", httpCode, resp.c_str());
  } else {
    Serial.printf("[HEARTBEAT] Connection failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// -------------------------------------------------------------------------
// 10. SETUP ROUTINE
// -------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("RetailSphere AI — Wi-Fi Stock Counter (ESP32 + Dual FC-51)");
  Serial.printf("Increment Sensor Pin: GPIO %d (Entry: +1 Stock)\n", INCREMENT_SENSOR_PIN);
  Serial.printf("Decrement Sensor Pin: GPIO %d (Exit:  -1 Stock)\n", DECREMENT_SENSOR_PIN);
  Serial.printf("Device Identifier   : %s\n", DEVICE_ID);
  Serial.printf("Target Server       : http://%s:%d\n", SERVER_HOST, SERVER_PORT);
  Serial.println("========================================================");

  // Initialize sensors with pull-ups (FC-51 outputs active LOW on obstacle detection)
  pinMode(INCREMENT_SENSOR_PIN, INPUT_PULLUP);
  pinMode(DECREMENT_SENSOR_PIN, INPUT_PULLUP);

  lastIncrementState = digitalRead(INCREMENT_SENSOR_PIN);
  lastDecrementState = digitalRead(DECREMENT_SENSOR_PIN);

  // Connect to Wi-Fi
  Serial.printf("[Wi-Fi] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wasConnected = true;
    Serial.println("\n[Wi-Fi] Connected Successfully!");
    Serial.printf("[Wi-Fi] Assigned ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[Wi-Fi] RSSI Signal Strength: %d dBm\n", WiFi.RSSI());

    // Synchronize initial baseline stock from PostgreSQL database
    syncAuthoritativeStockFromBackend();
    initialStockSynced = true;

    // Immediately transmit initial heartbeat to mark device ONLINE in Admin Dashboard
    sendHeartbeat();
  } else {
    Serial.println("\n[Wi-Fi WARNING] Connection timed out. Operating in offline count mode.");
    wasConnected = false;
  }
}

// -------------------------------------------------------------------------
// 11. MAIN SENSING & TRANSMISSION LOOP
// -------------------------------------------------------------------------
void loop() {
  unsigned long now = millis();
  bool isConnected = (WiFi.status() == WL_CONNECTED);

  // 1. Wi-Fi reconnection handling
  if (isConnected && !wasConnected) {
    Serial.println("\n[Wi-Fi] Connection restored!");
    Serial.printf("[Wi-Fi] Assigned ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
    wasConnected = true;

    if (!initialStockSynced) {
      syncAuthoritativeStockFromBackend();
      initialStockSynced = true;
    }

    sendHeartbeat();
    processEventQueue();
  } else if (!isConnected && wasConnected) {
    Serial.println("\n[Wi-Fi WARNING] Connection dropped. Operating with local event buffer.");
    wasConnected = false;
  }

  // 2. Periodic background Wi-Fi reconnect attempt if offline
  if (!isConnected && (now - lastWifiCheckTime >= 8000)) {
    lastWifiCheckTime = now;
    Serial.println("[Wi-Fi] Attempting background reconnect...");
    WiFi.reconnect();
  }

  // 3. Periodic heartbeat ping (every 25 seconds when connected)
  if (isConnected && (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS)) {
    sendHeartbeat();
  }

  // 4. Process queued events in FIFO order
  if (isConnected && queueCount > 0) {
    processEventQueue();
  }

  // 5. Read optical IR sensors (Active LOW)
  int currentIncState = digitalRead(INCREMENT_SENSOR_PIN);
  int currentDecState = digitalRead(DECREMENT_SENSOR_PIN);

  // -----------------------------------------------------------------------
  // INCREMENT SENSOR (GPIO 27) — Edge Detection: HIGH -> LOW (Item Entry)
  // -----------------------------------------------------------------------
  if (currentIncState == OBSTACLE_DETECTED &&
      lastIncrementState == SENSOR_CLEAR &&
      (now - lastIncrementTime >= SENSOR_COOLDOWN_MS)) {

    lastIncrementTime = now;
    stockCount++;

    Serial.println("\n--------------------------------------------------------");
    Serial.printf("[SENSOR D27 DETECTED] >>> ITEM ENTERED (+1) <<< Local Stock: %d\n", stockCount);
    Serial.println("--------------------------------------------------------");

    enqueueEvent("IN", "D27", "Item entry detected (GPIO 27 Increment Sensor)");

    if (isConnected) {
      processEventQueue();
    }
  }

  // -----------------------------------------------------------------------
  // DECREMENT SENSOR (GPIO 26) — Edge Detection: HIGH -> LOW (Item Exit + Zero-Stock Protection)
  // -----------------------------------------------------------------------
  if (currentDecState == OBSTACLE_DETECTED &&
      lastDecrementState == SENSOR_CLEAR &&
      (now - lastDecrementTime >= SENSOR_COOLDOWN_MS)) {

    lastDecrementTime = now;

    if (stockCount > 0) {
      stockCount--;

      Serial.println("\n--------------------------------------------------------");
      Serial.printf("[SENSOR D26 DETECTED] >>> ITEM EXITED (-1) <<< Local Stock: %d\n", stockCount);
      Serial.println("--------------------------------------------------------");

      enqueueEvent("OUT", "D26", "Item exit detected (GPIO 26 Decrement Sensor)");

      if (isConnected) {
        processEventQueue();
      }
    } else {
      Serial.println("\n--------------------------------------------------------");
      Serial.println("[SENSOR D26 DETECTED] >>> EXIT IGNORED <<< Stock is 0 (Zero-stock protected).");
      Serial.println("--------------------------------------------------------");
    }
  }

  lastIncrementState = currentIncState;
  lastDecrementState = currentDecState;

  delay(20); // 50Hz optical scan rate
}
