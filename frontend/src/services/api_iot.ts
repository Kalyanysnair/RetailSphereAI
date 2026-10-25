import { API_BASE_URL } from './api_admin';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export interface IoTInventoryMovement {
  movement_id: number;
  device_id: string;
  direction: 'IN' | 'OUT';
  stock_delta: number;
  stock_after: number;
  raw_sequence?: string | null;
  event_id?: string | null;
  notes?: string | null;
  device_timestamp?: string | null;
  created_at: string;
}

export interface IoTInventoryFreshness {
  status: 'ONLINE' | 'STALE' | 'OFFLINE' | 'NO_DATA';
  label: string;
  seconds_since_last_event: number | null;
  last_seen_at: string | null;
  stale_threshold_seconds: number;
  offline_threshold_seconds: number;
}

export interface IoTInventorySensorConfig {
  sensor_a_gpio: number;
  sensor_b_gpio: number;
  direction_in_rule: string;
  direction_out_rule: string;
  zero_stock_protection: boolean;
}

export interface IoTInventoryStatusResponse {
  has_data: boolean;
  device_id: string;
  current_stock: number;
  total_entries: number;
  total_exits: number;
  last_movement: {
    movement_id?: number | null;
    direction?: 'IN' | 'OUT' | null;
    stock_delta?: number | null;
    stock_after?: number;
    raw_sequence?: string | null;
    notes?: string | null;
    timestamp?: string | null;
  } | null;
  freshness: IoTInventoryFreshness;
  sensor_config: IoTInventorySensorConfig;
}

export interface IoTInventoryConfigMetadata {
  hardware: string;
  pinouts: {
    sensor_a: { gpio: number; name: string };
    sensor_b: { gpio: number; name: string };
    vcc: string;
    gnd: string;
  };
  movement_logic: {
    IN: string;
    OUT: string;
    zero_floor_protection: string;
  };
  endpoints: {
    passage_event: string;
    raw_trigger: string;
    heartbeat: string;
    status: string;
    history: string;
  };
  auth_header: string;
  timeouts: {
    sequence_window_seconds: number;
    stale_timeout_seconds: number;
    offline_timeout_seconds: number;
  };
}

function getPotentialUrls(pathAndQuery: string): string[] {
  const cleanPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  const urls: string[] = [];

  if (API_BASE_URL) {
    urls.push(`${API_BASE_URL}${cleanPath}`);
  }

  // Relative URL (standard Vite dev proxy or FastAPI static hosting)
  urls.push(cleanPath);

  // Direct backend on current host (LAN IP or domain)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol || 'http:';
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      urls.push(`${protocol}//${hostname}:8000${cleanPath}`);
    }
  }

  // Direct loopback candidates
  urls.push(`http://127.0.0.1:8000${cleanPath}`);
  urls.push(`http://localhost:8000${cleanPath}`);

  return Array.from(new Set(urls));
}

async function safeIoTFetch(pathAndQuery: string, options: RequestInit = {}): Promise<Response> {
  const urls = getPotentialUrls(pathAndQuery);
  let lastError: any = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...(options.headers || {})
        }
      });
      // If Vite proxy returns 503 (e.g. backend briefly restarting), fall through to direct target
      if (res.status === 503 && urls.length > 1) {
        lastError = new Error(`Proxy 503 on ${url}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError || new Error('Failed to connect to IoT backend');
}

/**
 * Fetch authoritative IoT inventory status, counts, last movement, and device connection freshness.
 */
export async function fetchIoTInventoryStatus(deviceId?: string): Promise<IoTInventoryStatusResponse> {
  const path = deviceId 
    ? `/api/iot/inventory/status?device_id=${encodeURIComponent(deviceId)}` 
    : `/api/iot/inventory/status`;

  try {
    const res = await safeIoTFetch(path, { method: 'GET' });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || errBody.error || `Failed to fetch IoT inventory telemetry (${res.status})`);
  } catch (e: any) {
    throw e;
  }
}

/**
 * Fetch chronological movement logs for the two-sensor inventory node.
 */
export async function fetchIoTInventoryHistory(deviceId?: string, limit: number = 30): Promise<IoTInventoryMovement[]> {
  const params = new URLSearchParams({ limit: String(limit), order: 'desc' });
  if (deviceId) {
    params.append('device_id', deviceId);
  }
  const path = `/api/iot/inventory/history?${params.toString()}`;

  try {
    const res = await safeIoTFetch(path, { method: 'GET' });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || errBody.error || `Failed to fetch historical IoT inventory movements (${res.status})`);
  } catch (e: any) {
    console.warn('[IoT Telemetry] Could not load movement history:', e.message);
    return [];
  }
}

/**
 * Admin reconciliation endpoint: manually calibrate or adjust the baseline stock count.
 */
export async function adjustIoTInventoryStock(newStock: number, notes: string = 'Manual Admin Stock Adjustment', deviceId?: string): Promise<any> {
  const path = `/api/admin/iot/inventory/adjust-stock`;
  const res = await safeIoTFetch(path, {
    method: 'POST',
    body: JSON.stringify({
      new_stock: newStock,
      notes,
      device_id: deviceId
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to adjust inventory stock (${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch public metadata for two-sensor hardware setup and pinout details.
 */
export async function fetchIoTInventoryConfig(): Promise<IoTInventoryConfigMetadata> {
  const path = `/api/iot/inventory/config`;
  const res = await safeIoTFetch(path, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to fetch IoT inventory setup config (${res.status})`);
  }
  return await res.json();
}

/**
 * Dispatch an authenticated heartbeat ping from the dashboard or admin test client
 * to verify live device connectivity.
 */
export async function sendIoTHeartbeat(deviceId?: string): Promise<{
  status: string;
  device_id: string;
  current_stock: number;
  last_heartbeat_at: string;
  message: string;
}> {
  const path = deviceId 
    ? `/api/admin/iot/inventory/heartbeat?device_id=${encodeURIComponent(deviceId)}`
    : `/api/admin/iot/inventory/heartbeat`;
  const res = await safeIoTFetch(path, {
    method: 'POST',
    body: JSON.stringify(deviceId ? { device_id: deviceId } : {})
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || `Failed to transmit IoT heartbeat (${res.status})`);
  }
  return await res.json();
}


