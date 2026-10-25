from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import threading
import time
import pytz

IST = pytz.timezone("Asia/Kolkata")

def get_now_ist() -> datetime:
    return datetime.now(IST)

def get_now_db() -> datetime:
    """
    Returns naive datetime in Asia/Kolkata IST.
    Matches PostgreSQL connection session timezone so raw SQL queries, pgAdmin, and logs
    all reflect accurate local Indian time.
    """
    return datetime.now(IST).replace(tzinfo=None)

def format_iso_ist(dt: Optional[datetime]) -> Optional[str]:
    """
    Formats datetime as an unambiguous ISO-8601 string with '+05:30' timezone offset.
    Prevents browsers and client libraries from interpreting local time as UTC.
    """
    if not dt:
        return None
    if dt.tzinfo is None:
        aware_dt = IST.localize(dt)
    else:
        aware_dt = dt.astimezone(IST)
    return aware_dt.isoformat()

from app.database import get_db
from app import models, auth
from app.config import settings

router = APIRouter(prefix="/api/iot", tags=["IoT Inventory Monitoring"])
admin_router = APIRouter(prefix="/api/admin/iot", tags=["IoT Inventory Monitoring (Admin)"])

# --------------------------------------------------------------------------
# IN-MEMORY SEQUENCE TRACKER FOR RAW TWO-SENSOR DETECTIONS
# Sensor A = GPIO 27, Sensor B = GPIO 26
# Sequence: A -> B = IN (+1 Stock)
# Sequence: B -> A = OUT (-1 Stock)
# --------------------------------------------------------------------------
_sensor_sequence_lock = threading.Lock()
_active_sensor_sequences: Dict[str, Dict[str, Any]] = {}
SEQUENCE_TIMEOUT_SECONDS = 4.0
DEBOUNCE_COOLDOWN_SECONDS = 0.6
_last_heartbeat_commit_ts: Dict[str, float] = {}


class InventoryMovementPayload(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100, description="ESP32 Device identifier")
    direction: str = Field(..., description="Movement direction: 'IN' (Entry) or 'OUT' (Exit)")
    raw_sequence: Optional[str] = Field("A->B", description="Sensor trigger sequence: 'A->B' or 'B->A'")
    event_id: Optional[str] = Field(None, max_length=100, description="Unique client sequence ID for deduplication")
    device_timestamp: Optional[datetime] = None
    notes: Optional[str] = None

    @validator("direction")
    def validate_direction(cls, v):
        clean = v.strip().upper()
        if clean not in ["IN", "OUT"]:
            raise ValueError("Direction must be either 'IN' or 'OUT'.")
        return clean

    @validator("device_id")
    def validate_device_id(cls, v):
        clean = v.strip()
        if not clean:
            raise ValueError("Device ID cannot be empty.")
        return clean


class SensorTriggerPayload(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=100)
    sensor: str = Field(..., description="Triggered sensor: 'A' (GPIO 27) or 'B' (GPIO 26)")
    device_timestamp: Optional[datetime] = None

    @validator("sensor")
    def validate_sensor(cls, v):
        clean = v.strip().upper()
        if clean not in ["A", "B"]:
            raise ValueError("Sensor must be either 'A' or 'B'.")
        return clean


class StockAdjustmentPayload(BaseModel):
    new_stock: int = Field(..., ge=0, description="Authoritative stock count (cannot be negative)")
    notes: Optional[str] = Field("Manual Admin Stock Adjustment", description="Audit notes for stock adjustment")
    device_id: Optional[str] = None


class HeartbeatPayload(BaseModel):
    device_id: Optional[str] = Field(None, max_length=100, description="ESP32 device identifier")


def verify_iot_device_auth(
    request: Request,
    x_iot_key: Optional[str] = Header(None, alias="X-IoT-Key"),
    authorization: Optional[str] = Header(None),
    secret_query: Optional[str] = Query(None, alias="secret"),
    api_key_query: Optional[str] = Query(None, alias="api_key"),
    db: Session = Depends(get_db)
) -> bool:
    """
    Validates IoT device communication via:
    1. Header 'X-IoT-Key' matching settings.IOT_DEVICE_SECRET
    2. Header 'Authorization: Bearer <secret>' matching settings.IOT_DEVICE_SECRET
    3. Query parameter ?secret=... or ?api_key=...
    4. Or valid JWT Bearer token of an existing Admin or Staff user
    """
    expected_secret = settings.IOT_DEVICE_SECRET.strip()

    if x_iot_key and x_iot_key.strip() == expected_secret:
        return True

    if secret_query and secret_query.strip() == expected_secret:
        return True
    if api_key_query and api_key_query.strip() == expected_secret:
        return True

    if authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()
            if token == expected_secret:
                return True
            try:
                user = auth.get_current_user_optional(token=token, db=db)
                if user and (user.role and user.role.role_name in ["Admin", "Retail Staff", "Production Staff"]):
                    return True
            except Exception:
                pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized IoT device. Provide valid 'X-IoT-Key' header or device secret."
    )


def compute_inventory_freshness(last_seen_at: Optional[datetime]) -> Dict[str, Any]:
    stale_sec = settings.IOT_STALE_TIMEOUT_SECONDS
    offline_sec = settings.IOT_OFFLINE_TIMEOUT_SECONDS

    if not last_seen_at:
        return {
            "status": "NO_DATA",
            "label": "No Sensor Data Available",
            "seconds_since_last_event": None,
            "last_seen_at": None,
            "stale_threshold_seconds": stale_sec,
            "offline_threshold_seconds": offline_sec
        }

    now_ist = datetime.now(IST)
    if last_seen_at.tzinfo is None:
        last_seen_aware = IST.localize(last_seen_at)
    else:
        last_seen_aware = last_seen_at.astimezone(IST)

    seconds_ago = max(0, int((now_ist - last_seen_aware).total_seconds()))

    if seconds_ago <= stale_sec:
        status_code = "ONLINE"
        status_label = "Online"
    elif seconds_ago <= offline_sec:
        status_code = "STALE"
        status_label = "Stale Telemetry"
    else:
        status_code = "OFFLINE"
        status_label = "Device Offline"

    return {
        "status": status_code,
        "label": status_label,
        "seconds_since_last_event": seconds_ago,
        "last_seen_at": format_iso_ist(last_seen_at),
        "stale_threshold_seconds": stale_sec,
        "offline_threshold_seconds": offline_sec
    }


def get_or_create_inventory_state(device_id: str, db: Session) -> models.IoTInventoryState:
    clean_dev = device_id.strip() if device_id else settings.IOT_DEFAULT_DEVICE_ID
    state = db.query(models.IoTInventoryState).filter(
        models.IoTInventoryState.device_id == clean_dev
    ).first()

    if not state:
        db_now = get_now_db()
        state = models.IoTInventoryState(
            device_id=clean_dev,
            current_stock=settings.IOT_INITIAL_BASELINE_STOCK,
            total_entries=0,
            total_exits=0,
            last_movement_direction=None,
            last_movement_at=None,
            last_heartbeat_at=None,
            updated_at=db_now
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    return state


def process_movement_event(
    device_id: str,
    direction: str,
    raw_sequence: Optional[str],
    event_id: Optional[str],
    device_timestamp: Optional[datetime],
    notes: Optional[str],
    db: Session
) -> Dict[str, Any]:
    """
    Core authoritative inventory transition:
    - Direction == IN: current_stock += 1, total_entries += 1
    - Direction == OUT: current_stock -= 1 (floored at 0 to prevent negative stock), total_exits += 1
    - Deduplicates identical event_id
    - Records verified Asia/Kolkata IST timestamps in database and response
    """
    clean_device = device_id.strip()
    clean_dir = direction.strip().upper()

    # Deduplication check
    if event_id and event_id.strip():
        existing_mov = db.query(models.IoTInventoryMovement).filter(
            models.IoTInventoryMovement.event_id == event_id.strip()
        ).first()
        if existing_mov:
            state = get_or_create_inventory_state(clean_device, db)
            return {
                "message": "Duplicate event ID ignored (already recorded).",
                "movement_id": existing_mov.movement_id,
                "direction": existing_mov.direction,
                "stock_delta": existing_mov.stock_delta,
                "current_stock": state.current_stock,
                "created_at": format_iso_ist(existing_mov.created_at),
                "is_duplicate": True
            }

    state = get_or_create_inventory_state(clean_device, db)
    db_now = get_now_db()

    # Normalize device_timestamp to naive IST if supplied by ESP32 NTP
    dev_ts = None
    if device_timestamp:
        if device_timestamp.tzinfo is None:
            dev_ts = device_timestamp
        else:
            dev_ts = device_timestamp.astimezone(IST).replace(tzinfo=None)

    if clean_dir == "IN":
        stock_delta = 1
        new_stock = state.current_stock + 1
        state.total_entries += 1
        note_text = notes or "Item entry detected (Sensor A -> Sensor B)"
    else:  # OUT
        if state.current_stock > 0:
            stock_delta = -1
            new_stock = state.current_stock - 1
            note_text = notes or "Item exit detected (Sensor B -> Sensor A)"
        else:
            # Zero-stock protection: never allow stock to become negative
            stock_delta = 0
            new_stock = 0
            note_text = notes or "Exit detected but stock already at zero; negative stock prevented."
        state.total_exits += 1

    state.current_stock = new_stock
    state.last_movement_direction = clean_dir
    state.last_movement_at = db_now
    state.last_heartbeat_at = db_now
    state.updated_at = db_now

    movement = models.IoTInventoryMovement(
        device_id=clean_device,
        direction=clean_dir,
        stock_delta=stock_delta,
        stock_after=new_stock,
        raw_sequence=raw_sequence or ("A->B" if clean_dir == "IN" else "B->A"),
        event_id=event_id.strip() if (event_id and event_id.strip()) else None,
        notes=note_text,
        device_timestamp=dev_ts or db_now,
        created_at=db_now
    )

    db.add(movement)
    db.commit()
    db.refresh(movement)

    return {
        "success": True,
        "movement_id": movement.movement_id,
        "device_id": movement.device_id,
        "direction": movement.direction,
        "stock_delta": movement.stock_delta,
        "stock_after": movement.stock_after,
        "current_stock": state.current_stock,
        "total_entries": state.total_entries,
        "total_exits": state.total_exits,
        "raw_sequence": movement.raw_sequence,
        "notes": movement.notes,
        "created_at": format_iso_ist(movement.created_at),
        "is_duplicate": False
    }


# --------------------------------------------------------------------------
# TELEMETRY & EVENT INGESTION ENDPOINTS (Used by ESP32 over Wi-Fi)
# --------------------------------------------------------------------------

@router.post("/inventory/event", status_code=status.HTTP_201_CREATED)
@router.post("/inventory/movement", status_code=status.HTTP_201_CREATED)
def record_inventory_movement(
    payload: InventoryMovementPayload,
    is_authenticated: bool = Depends(verify_iot_device_auth),
    db: Session = Depends(get_db)
):
    """
    Ingest validated passage event directly from ESP32:
    - IN: Sensor A triggered first, then Sensor B (+1 furniture item)
    - OUT: Sensor B triggered first, then Sensor A (-1 furniture item, zero-floor protected)
    """
    res = process_movement_event(
        device_id=payload.device_id,
        direction=payload.direction,
        raw_sequence=payload.raw_sequence,
        event_id=payload.event_id,
        device_timestamp=payload.device_timestamp,
        notes=payload.notes,
        db=db
    )
    return res


@router.post("/inventory/sensor-trigger")
def record_raw_sensor_trigger(
    payload: SensorTriggerPayload,
    is_authenticated: bool = Depends(verify_iot_device_auth),
    db: Session = Depends(get_db)
):
    """
    Receives raw individual trigger from Sensor A (GPIO 27) or Sensor B (GPIO 26).
    Performs server-side two-sensor sequence detection and debouncing:
    - A followed by B within 2.5s -> Evaluates to 'IN' event (+1 Stock)
    - B followed by A within 2.5s -> Evaluates to 'OUT' event (-1 Stock)
    - Noise, repeated triggers, and timeouts are filtered safely.
    """
    dev_id = payload.device_id.strip()
    sensor = payload.sensor.strip().upper()
    now_ts = time.time()

    # Update last-seen timestamp on state for any valid authenticated sensor report
    db_now = get_now_db()
    state = get_or_create_inventory_state(dev_id, db)
    state.last_heartbeat_at = db_now
    state.updated_at = db_now
    db.commit()

    with _sensor_sequence_lock:
        seq_state = _active_sensor_sequences.get(dev_id)

        # Check debounce cooldown on same sensor (e.g. optical flicker)
        if seq_state and seq_state.get("last_sensor") == sensor and (now_ts - seq_state.get("last_trigger_ts", 0) < 0.15):
            return {"status": "DEBOUNCE_IGNORED", "message": f"Rapid bounce trigger on Sensor {sensor} ignored."}

        # If no active sequence or previous sequence expired (> 2.5s)
        if not seq_state or (now_ts - seq_state.get("first_trigger_ts", 0) > SEQUENCE_TIMEOUT_SECONDS):
            _active_sensor_sequences[dev_id] = {
                "first_sensor": sensor,
                "last_sensor": sensor,
                "first_trigger_ts": now_ts,
                "last_trigger_ts": now_ts
            }
            return {
                "status": "SEQUENCE_INITIATED",
                "first_sensor": sensor,
                "waiting_for": "B" if sensor == "A" else "A",
                "timeout_seconds": SEQUENCE_TIMEOUT_SECONDS
            }

        first_sensor = seq_state["first_sensor"]

        # Repeated trigger on same sensor (e.g. A then A again after cooldown)
        if first_sensor == sensor:
            seq_state["last_sensor"] = sensor
            seq_state["last_trigger_ts"] = now_ts
            return {"status": "REPEATED_TRIGGER_IGNORED", "message": f"Sensor {sensor} already active."}


        # Sequence Completed!
        _active_sensor_sequences.pop(dev_id, None)

        if first_sensor == "A" and sensor == "B":
            detected_direction = "IN"
            seq_name = "A->B"
        else:
            detected_direction = "OUT"
            seq_name = "B->A"

    # Process authoritative stock change
    movement_res = process_movement_event(
        device_id=dev_id,
        direction=detected_direction,
        raw_sequence=seq_name,
        event_id=f"seq-{dev_id}-{int(now_ts * 1000)}",
        device_timestamp=payload.device_timestamp,
        notes=f"Two-sensor sequence completed: {seq_name} (GPIO 27 & GPIO 26)",
        db=db
    )

    return {
        "status": "SEQUENCE_COMPLETED",
        "direction": detected_direction,
        "movement": movement_res
    }


@router.post("/inventory/heartbeat")
@admin_router.post("/inventory/heartbeat")
async def record_device_heartbeat(
    request: Request,
    device_id: Optional[str] = Query(None, description="ESP32 device identifier"),
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    is_authenticated: bool = Depends(verify_iot_device_auth),
    db: Session = Depends(get_db)
):
    """
    Heartbeat ping from ESP32 to maintain ONLINE connection freshness
    even when no items are actively moving past the beam sensors.
    Accepts device_id from query parameter, JSON body, X-Device-Id header,
    or falls back to settings.IOT_DEFAULT_DEVICE_ID.
    """
    resolved_device_id = device_id or x_device_id
    if not resolved_device_id:
        try:
            raw_body = await request.body()
            if raw_body and raw_body.strip():
                import json
                parsed_json = json.loads(raw_body.decode("utf-8", errors="ignore"))
                if isinstance(parsed_json, dict):
                    resolved_device_id = parsed_json.get("device_id")
        except Exception:
            pass

    clean_dev = (resolved_device_id or settings.IOT_DEFAULT_DEVICE_ID).strip()
    client_ip = request.client.host if request.client else "unknown"

    now_wall = time.time()
    db_now = get_now_db()

    # Throttle DB writes: only write heartbeat to PostgreSQL once every 20s per device
    if clean_dev not in _last_heartbeat_commit_ts or (now_wall - _last_heartbeat_commit_ts[clean_dev] > 20):
        state = get_or_create_inventory_state(clean_dev, db)
        state.last_heartbeat_at = db_now
        state.updated_at = db_now
        db.commit()
        _last_heartbeat_commit_ts[clean_dev] = now_wall
        current_stock_val = state.current_stock
    else:
        # Fast path: read from cache or lightweight query without write lock
        cached_stock = getattr(db, "_cached_iot_stock", None)
        if cached_stock is None:
            st = db.query(models.IoTInventoryState.current_stock).filter(models.IoTInventoryState.device_id == clean_dev).first()
            current_stock_val = st[0] if st else 0
        else:
            current_stock_val = cached_stock

    return {
        "status": "ONLINE",
        "device_id": clean_dev,
        "device_ip": client_ip,
        "current_stock": current_stock_val,
        "last_heartbeat_at": format_iso_ist(db_now),
        "message": f"Heartbeat recorded successfully from {client_ip}"
    }


# --------------------------------------------------------------------------
# ADMIN & QUERY ENDPOINTS (Shared logic for /api/iot/... and /api/admin/iot/...)
# --------------------------------------------------------------------------

def get_inventory_status_data(device_id: Optional[str], db: Session) -> Dict[str, Any]:
    clean_dev = device_id.strip() if device_id else settings.IOT_DEFAULT_DEVICE_ID
    
    state = None
    latest_mov = None
    total_movements_count = 0

    # Retry once on transient database connection/DNS drops
    for attempt in range(2):
        try:
            state = db.query(models.IoTInventoryState).filter(
                models.IoTInventoryState.device_id == clean_dev
            ).first()

            latest_mov = db.query(models.IoTInventoryMovement).filter(
                models.IoTInventoryMovement.device_id == clean_dev
            ).order_by(models.IoTInventoryMovement.created_at.desc()).first()

            total_movements_count = db.query(models.IoTInventoryMovement).filter(
                models.IoTInventoryMovement.device_id == clean_dev
            ).count()
            break
        except Exception as e:
            try:
                db.rollback()
            except Exception:
                pass
            if attempt == 0:
                time.sleep(0.3)
                continue
            # If database is temporarily unavailable after retry, log and return safe fallback state
            print(f"[IOT STATUS WARNING] Database query failed ({type(e).__name__}: {e}). Returning fallback status.")
            return {
                "has_data": False,
                "device_id": clean_dev,
                "current_stock": 0,
                "total_entries": 0,
                "total_exits": 0,
                "last_movement": None,
                "freshness": {
                    "status": "NO_DATA",
                    "label": "Database Temporarily Reconnecting",
                    "seconds_since_last_event": None,
                    "last_seen_at": None,
                    "stale_threshold_seconds": settings.IOT_STALE_TIMEOUT_SECONDS,
                    "offline_threshold_seconds": settings.IOT_OFFLINE_TIMEOUT_SECONDS
                },
                "sensor_config": {
                    "sensor_a_gpio": 27,
                    "sensor_b_gpio": 26,
                    "direction_in_rule": "Sensor A (GPIO 27) first -> Sensor B (GPIO 26) second",
                    "direction_out_rule": "Sensor B (GPIO 26) first -> Sensor A (GPIO 27) second",
                    "zero_stock_protection": True
                }
            }

    # Determine last activity time (movement or heartbeat)
    last_activity_time = None
    if state:
        candidates = [t for t in [state.last_movement_at, state.last_heartbeat_at] if t is not None]
        if candidates:
            last_activity_time = max(candidates)
    if not last_activity_time and latest_mov:
        last_activity_time = latest_mov.created_at

    # If neither state nor movements exist, report has_data = False
    has_data = bool(state and (total_movements_count > 0 or state.last_heartbeat_at is not None))

    freshness = compute_inventory_freshness(last_activity_time)

    current_stock = state.current_stock if state else 0
    total_entries = state.total_entries if state else 0
    total_exits = state.total_exits if state else 0

    return {
        "has_data": has_data,
        "device_id": clean_dev,
        "current_stock": current_stock,
        "total_entries": total_entries,
        "total_exits": total_exits,
        "last_movement": {
            "movement_id": latest_mov.movement_id if latest_mov else None,
            "direction": latest_mov.direction if latest_mov else (state.last_movement_direction if state else None),
            "stock_delta": latest_mov.stock_delta if latest_mov else None,
            "stock_after": latest_mov.stock_after if latest_mov else current_stock,
            "raw_sequence": latest_mov.raw_sequence if latest_mov else None,
            "notes": latest_mov.notes if latest_mov else None,
            "timestamp": format_iso_ist(latest_mov.created_at) if latest_mov else None
        } if latest_mov or (state and state.last_movement_direction) else None,
        "freshness": freshness,
        "sensor_config": {
            "sensor_a_gpio": 27,
            "sensor_b_gpio": 26,
            "direction_in_rule": "Sensor A (GPIO 27) first -> Sensor B (GPIO 26) second",
            "direction_out_rule": "Sensor B (GPIO 26) first -> Sensor A (GPIO 27) second",
            "zero_stock_protection": True
        }
    }


def get_inventory_history_data(
    device_id: Optional[str],
    limit: int,
    order: str,
    db: Session
) -> List[Dict[str, Any]]:
    for attempt in range(2):
        try:
            query = db.query(models.IoTInventoryMovement)
            if device_id:
                query = query.filter(models.IoTInventoryMovement.device_id == device_id.strip())

            if order.lower() == "asc":
                query = query.order_by(models.IoTInventoryMovement.created_at.asc())
            else:
                query = query.order_by(models.IoTInventoryMovement.created_at.desc())

            items = query.limit(limit).all()
            return [
                {
                    "movement_id": m.movement_id,
                    "device_id": m.device_id,
                    "direction": m.direction,
                    "stock_delta": m.stock_delta,
                    "stock_after": m.stock_after,
                    "raw_sequence": m.raw_sequence,
                    "event_id": m.event_id,
                    "notes": m.notes,
                    "device_timestamp": format_iso_ist(m.device_timestamp),
                    "created_at": format_iso_ist(m.created_at)
                }
                for m in items
            ]
        except Exception as e:
            try:
                db.rollback()
            except Exception:
                pass
            if attempt == 0:
                time.sleep(0.3)
                continue
            print(f"[IOT HISTORY WARNING] Database query failed ({type(e).__name__}: {e}). Returning empty list.")
            return []


# Endpoint bindings for /api/iot/...
@router.get("/inventory/status")
@router.get("/latest")
def get_iot_inventory_status(device_id: Optional[str] = None, db: Session = Depends(get_db)):
    return get_inventory_status_data(device_id, db)

@router.get("/inventory/history")
@router.get("/history")
def get_iot_inventory_history(
    device_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    return get_inventory_history_data(device_id, limit, order, db)

@router.get("/inventory/config")
@router.get("/config")
def get_iot_inventory_config():
    """
    Public connection and hardware pinout metadata for ESP32 developers.
    """
    return {
        "hardware": "ESP32 + Dual FC-51 IR Obstacle Detection Sensors",
        "pinouts": {
            "sensor_a": {"gpio": 27, "name": "Sensor A (Outer Beam)"},
            "sensor_b": {"gpio": 26, "name": "Sensor B (Inner Beam)"},
            "vcc": "3.3V or 5V DC",
            "gnd": "GND"
        },
        "movement_logic": {
            "IN": "Sensor A triggers first, followed by Sensor B -> Stock +1",
            "OUT": "Sensor B triggers first, followed by Sensor A -> Stock -1",
            "zero_floor_protection": "Stock count is never allowed to drop below 0"
        },
        "endpoints": {
            "passage_event": "/api/iot/inventory/event",
            "raw_trigger": "/api/iot/inventory/sensor-trigger",
            "heartbeat": "/api/iot/inventory/heartbeat",
            "status": "/api/iot/inventory/status",
            "history": "/api/iot/inventory/history"
        },
        "auth_header": "X-IoT-Key",
        "timeouts": {
            "sequence_window_seconds": SEQUENCE_TIMEOUT_SECONDS,
            "stale_timeout_seconds": settings.IOT_STALE_TIMEOUT_SECONDS,
            "offline_timeout_seconds": settings.IOT_OFFLINE_TIMEOUT_SECONDS
        }
    }


# Admin router bindings for /api/admin/iot/...
@admin_router.get("/inventory/status")
@admin_router.get("/latest")
def get_admin_iot_inventory_status(device_id: Optional[str] = None, db: Session = Depends(get_db)):
    return get_inventory_status_data(device_id, db)

@admin_router.get("/inventory/history")
@admin_router.get("/history")
def get_admin_iot_inventory_history(
    device_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    return get_inventory_history_data(device_id, limit, order, db)

@admin_router.post("/inventory/adjust-stock")
def adjust_inventory_stock_admin(
    payload: StockAdjustmentPayload,
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Admin reconciliation endpoint: manually set baseline stock count.
    """
    dev_id = payload.device_id.strip() if payload.device_id else settings.IOT_DEFAULT_DEVICE_ID
    state = get_or_create_inventory_state(dev_id, db)

    old_stock = state.current_stock
    state.current_stock = payload.new_stock
    db_now = get_now_db()
    state.updated_at = db_now

    audit_entry = models.IoTInventoryMovement(
        device_id=dev_id,
        direction="IN" if payload.new_stock >= old_stock else "OUT",
        stock_delta=payload.new_stock - old_stock,
        stock_after=payload.new_stock,
        raw_sequence="MANUAL_ADJUSTMENT",
        event_id=f"adj-{int(time.time() * 1000)}",
        notes=f"Admin Adjustment by {current_user.full_name if current_user else 'Admin'}: {payload.notes} (Old: {old_stock} -> New: {payload.new_stock})",
        device_timestamp=db_now,
        created_at=db_now
    )
    db.add(audit_entry)
    db.commit()

    return {
        "success": True,
        "device_id": dev_id,
        "previous_stock": old_stock,
        "new_stock": payload.new_stock,
        "adjusted_by": current_user.full_name if current_user else "Admin",
        "created_at": format_iso_ist(db_now),
        "notes": payload.notes,
        "message": f"Inventory stock reconciled to {state.current_stock} items."
    }
