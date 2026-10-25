import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models
from app.config import settings

client = TestClient(app)

def run_iot_inventory_test_suite():
    print("=" * 75)
    print("RETAILSPHERE AI - TWO-SENSOR IOT INVENTORY MONITORING TEST SUITE")
    print("Hardware: ESP32 + Dual FC-51 (Sensor A: GPIO 27, Sensor B: GPIO 26)")
    print("=" * 75)

    db = SessionLocal()
    test_device_id = "TEST-ESP32-GATE-UNIT-01"

    try:
        # Cleanup pre-existing test records
        db.query(models.IoTInventoryMovement).filter(
            models.IoTInventoryMovement.device_id.like("TEST-%")
        ).delete(synchronize_session=False)
        db.query(models.IoTInventoryState).filter(
            models.IoTInventoryState.device_id.like("TEST-%")
        ).delete(synchronize_session=False)
        db.commit()

        # -------------------------------------------------------------
        # TEST 1: EMPTY STATE
        # -------------------------------------------------------------
        print("\n[TEST 1] Testing Empty State (No Sensor Data Available)...")
        res1 = client.get(f"/api/iot/inventory/status?device_id={test_device_id}")
        assert res1.status_code == 200, f"Expected 200, got {res1.status_code}"
        d1 = res1.json()
        assert d1["has_data"] is False, f"Expected has_data=False, got {d1['has_data']}"
        assert d1["current_stock"] == 0
        assert d1["total_entries"] == 0
        assert d1["total_exits"] == 0
        assert d1["last_movement"] is None
        assert d1["freshness"]["status"] == "NO_DATA"
        assert d1["sensor_config"]["sensor_a_gpio"] == 27
        assert d1["sensor_config"]["sensor_b_gpio"] == 26
        print("  [OK] Empty state verified: has_data=False, freshness=NO_DATA, stock=0.")

        # Test admin alias endpoint
        res1_admin = client.get(f"/api/admin/iot/inventory/status?device_id={test_device_id}")
        assert res1_admin.status_code == 200
        assert res1_admin.json()["has_data"] is False
        print("  [OK] Admin alias /api/admin/iot/inventory/status works identically.")

        # -------------------------------------------------------------
        # TEST 2: AUTHENTICATION & VALIDATION FAILURES
        # -------------------------------------------------------------
        print("\n[TEST 2] Testing Device Authentication & Validation Failures...")
        p_invalid = {"device_id": test_device_id, "direction": "IN"}
        
        # 2a: Missing auth secret
        res_no_auth = client.post("/api/iot/inventory/event", json=p_invalid)
        assert res_no_auth.status_code == 401, f"Expected 401, got {res_no_auth.status_code}"
        print("  [OK] Unauthorized request with missing key rejected (401).")

        # 2b: Wrong auth secret
        res_bad_auth = client.post(
            "/api/iot/inventory/event",
            json=p_invalid,
            headers={"X-IoT-Key": "invalid-secret-key-123"}
        )
        assert res_bad_auth.status_code == 401, f"Expected 401, got {res_bad_auth.status_code}"
        print("  [OK] Unauthorized request with invalid key rejected (401).")

        # 2c: Invalid direction string
        p_bad_dir = {"device_id": test_device_id, "direction": "SIDEWAYS"}
        res_bad_dir = client.post(
            "/api/iot/inventory/event",
            json=p_bad_dir,
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_bad_dir.status_code == 422, f"Expected 422 validation error, got {res_bad_dir.status_code}"
        print("  [OK] Invalid direction rejected by Pydantic validator (422).")

        # -------------------------------------------------------------
        # TEST 3: VALID ENTRY MOVEMENT (Sensor A -> Sensor B: IN, +1)
        # -------------------------------------------------------------
        print("\n[TEST 3] Testing Item Entry Movement (Sensor A -> Sensor B: IN, Stock +1)...")
        p_entry1 = {
            "device_id": test_device_id,
            "direction": "IN",
            "raw_sequence": "A->B",
            "event_id": f"test-evt-in-01",
            "notes": "Passage detected: Sensor A (GPIO 27) then Sensor B (GPIO 26)"
        }
        res_entry1 = client.post(
            "/api/iot/inventory/event",
            json=p_entry1,
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_entry1.status_code == 201, f"Expected 201, got {res_entry1.status_code}"
        d_e1 = res_entry1.json()
        assert d_e1["direction"] == "IN"
        assert d_e1["stock_delta"] == 1
        assert d_e1["stock_after"] == 1
        assert d_e1["current_stock"] == 1
        assert d_e1["total_entries"] == 1
        assert d_e1["total_exits"] == 0
        print("  [OK] First entry recorded: stock increased from 0 to 1, total_entries=1.")

        # Second entry
        p_entry2 = {
            "device_id": test_device_id,
            "direction": "IN",
            "raw_sequence": "A->B",
            "event_id": f"test-evt-in-02"
        }
        res_entry2 = client.post(
            "/api/iot/inventory/event",
            json=p_entry2,
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_entry2.status_code == 201
        assert res_entry2.json()["current_stock"] == 2
        assert res_entry2.json()["total_entries"] == 2
        print("  [OK] Second entry recorded: stock increased from 1 to 2, total_entries=2.")

        # Check status endpoint
        res_stat = client.get(f"/api/iot/inventory/status?device_id={test_device_id}")
        assert res_stat.status_code == 200
        d_st = res_stat.json()
        assert d_st["has_data"] is True
        assert d_st["current_stock"] == 2
        assert d_st["total_entries"] == 2
        assert d_st["last_movement"]["direction"] == "IN"
        assert d_st["freshness"]["status"] == "ONLINE"
        print("  [OK] Status endpoint reports has_data=True, stock=2, freshness=ONLINE.")

        # -------------------------------------------------------------
        # TEST 4: DEDUPLICATION CHECK (No Double Counting)
        # -------------------------------------------------------------
        print("\n[TEST 4] Testing Deduplication Protection (Re-sending duplicate event_id)...")
        res_dup = client.post(
            "/api/iot/inventory/event",
            json=p_entry2,
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_dup.status_code == 201
        d_dup = res_dup.json()
        assert d_dup["is_duplicate"] is True
        assert d_dup["current_stock"] == 2, f"Stock should remain 2, but got {d_dup['current_stock']}"
        print("  [OK] Duplicate event successfully detected: stock maintained at 2 without double-counting.")

        # -------------------------------------------------------------
        # TEST 5: VALID EXIT MOVEMENT (Sensor B -> Sensor A: OUT, -1)
        # -------------------------------------------------------------
        print("\n[TEST 5] Testing Item Exit Movement (Sensor B -> Sensor A: OUT, Stock -1)...")
        p_exit1 = {
            "device_id": test_device_id,
            "direction": "OUT",
            "raw_sequence": "B->A",
            "event_id": f"test-evt-out-01"
        }
        res_exit1 = client.post(
            "/api/iot/inventory/event",
            json=p_exit1,
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_exit1.status_code == 201
        d_x1 = res_exit1.json()
        assert d_x1["direction"] == "OUT"
        assert d_x1["stock_delta"] == -1
        assert d_x1["current_stock"] == 1
        assert d_x1["total_exits"] == 1
        print("  [OK] Exit recorded: stock decreased from 2 to 1, total_exits=1.")

        # Second exit (brings stock to 0)
        p_exit2 = {
            "device_id": test_device_id,
            "direction": "OUT",
            "raw_sequence": "B->A",
            "event_id": f"test-evt-out-02"
        }
        res_exit2 = client.post(
            "/api/iot/inventory/event",
            json=p_exit2,
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_exit2.status_code == 201
        assert res_exit2.json()["current_stock"] == 0
        assert res_exit2.json()["total_exits"] == 2
        print("  [OK] Second exit recorded: stock decreased from 1 to 0.")

        # -------------------------------------------------------------
        # TEST 6: ZERO-STOCK PROTECTION (Never Drop Below Zero)
        # -------------------------------------------------------------
        print("\n[TEST 6] Testing Zero-Stock Protection (Exit when Stock is already 0)...")
        p_exit_excess = {
            "device_id": test_device_id,
            "direction": "OUT",
            "raw_sequence": "B->A",
            "event_id": f"test-evt-out-excess"
        }
        res_excess = client.post(
            "/api/iot/inventory/event",
            json=p_exit_excess,
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_excess.status_code == 201
        d_ex = res_excess.json()
        assert d_ex["current_stock"] == 0, f"Stock must NOT become negative, got {d_ex['current_stock']}"
        assert d_ex["stock_delta"] == 0, f"Delta must be 0 when floored, got {d_ex['stock_delta']}"
        assert "negative stock prevented" in d_ex["notes"].lower()
        print("  [OK] Zero-stock protection verified: stock remains 0, delta=0, negative count prevented.")

        # -------------------------------------------------------------
        # TEST 7: RAW TWO-SENSOR SEQUENCE LOGIC (Sensor A & B Triggers)
        # -------------------------------------------------------------
        print("\n[TEST 7] Testing Raw Sensor Trigger State Machine (Sensor A: 27, Sensor B: 26)...")
        # 7a: Sensor A triggers first
        res_raw_a = client.post(
            "/api/iot/inventory/sensor-trigger",
            json={"device_id": test_device_id, "sensor": "A"},
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_raw_a.status_code == 200
        assert res_raw_a.json()["status"] == "SEQUENCE_INITIATED"
        assert res_raw_a.json()["waiting_for"] == "B"
        print("  [OK] Sensor A trigger initiated sequence, waiting for Sensor B.")

        # 7b: Sensor A triggers again (repeated bounce/noise -> should ignore)
        res_raw_a_rep = client.post(
            "/api/iot/inventory/sensor-trigger",
            json={"device_id": test_device_id, "sensor": "A"},
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_raw_a_rep.status_code == 200
        assert "IGNORED" in res_raw_a_rep.json()["status"]
        print("  [OK] Repeated Sensor A trigger safely ignored as optical bounce.")

        # 7c: Sensor B triggers within window -> Completes IN sequence!
        res_raw_b = client.post(
            "/api/iot/inventory/sensor-trigger",
            json={"device_id": test_device_id, "sensor": "B"},
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_raw_b.status_code == 200
        d_raw_b = res_raw_b.json()
        assert d_raw_b["status"] == "SEQUENCE_COMPLETED"
        assert d_raw_b["direction"] == "IN"
        assert d_raw_b["movement"]["current_stock"] == 1
        print("  [OK] Sensor B completed passage sequence (A->B = IN): stock incremented to 1.")

        # -------------------------------------------------------------
        # TEST 8: STALE & OFFLINE FRESHNESS
        # -------------------------------------------------------------
        print("\n[TEST 8] Testing Stale (>120s) and Offline (>300s) Device Freshness...")
        state_row = db.query(models.IoTInventoryState).filter(
            models.IoTInventoryState.device_id == test_device_id
        ).first()

        # 8a: Stale test: set last activity to 150 seconds ago
        from app.routers.iot import get_now_db
        db_now = get_now_db()
        state_row.last_movement_at = db_now - timedelta(seconds=150)
        state_row.last_heartbeat_at = db_now - timedelta(seconds=150)
        db.query(models.IoTInventoryMovement).filter(
            models.IoTInventoryMovement.device_id == test_device_id
        ).update({models.IoTInventoryMovement.created_at: db_now - timedelta(seconds=150)})
        db.commit()

        res_stale = client.get(f"/api/iot/inventory/status?device_id={test_device_id}")
        assert res_stale.status_code == 200
        assert res_stale.json()["freshness"]["status"] == "STALE"
        print(f"  [OK] Stale connection verified (elapsed {res_stale.json()['freshness']['seconds_since_last_event']}s > 120s).")

        # 8b: Offline test: set last activity to 350 seconds ago
        state_row.last_movement_at = db_now - timedelta(seconds=350)
        state_row.last_heartbeat_at = db_now - timedelta(seconds=350)
        db.query(models.IoTInventoryMovement).filter(
            models.IoTInventoryMovement.device_id == test_device_id
        ).update({models.IoTInventoryMovement.created_at: db_now - timedelta(seconds=350)})
        db.commit()

        res_offline = client.get(f"/api/iot/inventory/status?device_id={test_device_id}")
        assert res_offline.status_code == 200
        assert res_offline.json()["freshness"]["status"] == "OFFLINE"
        print(f"  [OK] Offline connection verified (elapsed {res_offline.json()['freshness']['seconds_since_last_event']}s > 300s).")

        # -------------------------------------------------------------
        # TEST 9: HEARTBEAT AUTHENTICATION, SCHEMAS & OFFLINE RECOVERY
        # -------------------------------------------------------------
        print("\n[TEST 9] Testing Heartbeat Auth, Schemas, Timestamp Updates & Recovery...")

        # 9a: Missing authentication rejected (401)
        res_hb_noauth = client.post(f"/api/iot/inventory/heartbeat?device_id={test_device_id}")
        assert res_hb_noauth.status_code == 401, f"Expected 401, got {res_hb_noauth.status_code}"
        print("  [OK] Unauthenticated heartbeat rejected with 401.")

        # 9b: Invalid secret key rejected (401)
        res_hb_badkey = client.post(
            f"/api/iot/inventory/heartbeat?device_id={test_device_id}",
            headers={"X-IoT-Key": "invalid-iot-key-abc"}
        )
        assert res_hb_badkey.status_code == 401
        print("  [OK] Heartbeat with invalid key rejected with 401.")

        # Verify device remains OFFLINE after rejected heartbeats
        res_still_offline = client.get(f"/api/iot/inventory/status?device_id={test_device_id}")
        assert res_still_offline.json()["freshness"]["status"] == "OFFLINE"
        print("  [OK] Device status remains OFFLINE; unauthenticated heartbeats do not update timestamp.")

        # 9c: Valid X-IoT-Key brings device back to ONLINE immediately
        res_hb_valid = client.post(
            f"/api/iot/inventory/heartbeat?device_id={test_device_id}",
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_hb_valid.status_code == 200, f"Expected 200, got {res_hb_valid.status_code}"
        hb_data = res_hb_valid.json()
        assert hb_data["status"] == "ONLINE"
        assert hb_data["device_id"] == test_device_id
        assert hb_data["current_stock"] == 1
        assert hb_data["last_heartbeat_at"] is not None

        # Verify status endpoint immediately reflects ONLINE with fresh timestamp
        res_now_online = client.get(f"/api/iot/inventory/status?device_id={test_device_id}")
        assert res_now_online.status_code == 200
        assert res_now_online.json()["freshness"]["status"] == "ONLINE"
        assert res_now_online.json()["freshness"]["seconds_since_last_event"] <= 15
        print(f"  [OK] Valid heartbeat immediately restored status to ONLINE (freshness={res_now_online.json()['freshness']['seconds_since_last_event']}s ago).")

        # 9d: Alternative authentication methods (Query param secret and Bearer token)
        res_hb_query = client.post(f"/api/iot/inventory/heartbeat?device_id={test_device_id}&secret={settings.IOT_DEVICE_SECRET}")
        assert res_hb_query.status_code == 200
        print("  [OK] Heartbeat with ?secret= query param accepted (200).")

        res_hb_bearer = client.post(
            f"/api/iot/inventory/heartbeat?device_id={test_device_id}",
            headers={"Authorization": f"Bearer {settings.IOT_DEVICE_SECRET}"}
        )
        assert res_hb_bearer.status_code == 200
        print("  [OK] Heartbeat with Authorization: Bearer <secret> accepted (200).")

        # 9e: Request schema variations (JSON body, Header, Query param, Default fallback)
        schema_dev_json = "TEST-ESP32-JSON-BODY"
        res_hb_json = client.post(
            "/api/iot/inventory/heartbeat",
            json={"device_id": schema_dev_json},
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_hb_json.status_code == 200
        assert res_hb_json.json()["device_id"] == schema_dev_json
        print("  [OK] Heartbeat with JSON body {'device_id': ...} parsed and accepted (200).")

        schema_dev_hdr = "TEST-ESP32-HDR-DEV"
        res_hb_hdr = client.post(
            "/api/iot/inventory/heartbeat",
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET, "X-Device-Id": schema_dev_hdr}
        )
        assert res_hb_hdr.status_code == 200
        assert res_hb_hdr.json()["device_id"] == schema_dev_hdr
        print("  [OK] Heartbeat with X-Device-Id header accepted (200).")

        res_hb_default = client.post(
            "/api/iot/inventory/heartbeat",
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_hb_default.status_code == 200
        assert res_hb_default.json()["device_id"] == settings.IOT_DEFAULT_DEVICE_ID
        print(f"  [OK] Heartbeat without device_id falls back to default '{settings.IOT_DEFAULT_DEVICE_ID}' (200).")

        # 9f: Admin alias endpoint /api/admin/iot/inventory/heartbeat
        res_hb_admin = client.post(
            f"/api/admin/iot/inventory/heartbeat?device_id={test_device_id}",
            headers={"X-IoT-Key": settings.IOT_DEVICE_SECRET}
        )
        assert res_hb_admin.status_code == 200
        assert res_hb_admin.json()["status"] == "ONLINE"
        print("  [OK] Admin alias endpoint /api/admin/iot/inventory/heartbeat works identically (200).")

        # -------------------------------------------------------------
        # TEST 10: HISTORY & HARDWARE CONFIG ENDPOINTS
        # -------------------------------------------------------------
        print("\n[TEST 10] Testing History & Hardware Config Endpoints...")
        res_hist = client.get(f"/api/iot/inventory/history?device_id={test_device_id}&limit=10")
        assert res_hist.status_code == 200
        hist_items = res_hist.json()
        assert len(hist_items) >= 4
        print(f"  [OK] History endpoint returned {len(hist_items)} chronological records.")

        res_cfg = client.get("/api/iot/inventory/config")
        assert res_cfg.status_code == 200
        cfg_data = res_cfg.json()
        assert cfg_data["pinouts"]["sensor_a"]["gpio"] == 27
        assert cfg_data["pinouts"]["sensor_b"]["gpio"] == 26
        assert "retailsphere-iot-inventory-secret-2026" not in str(cfg_data)
        print("  [OK] Config endpoint verified: correctly describes GPIO 27 & 26 without leaking secrets.")

        # -------------------------------------------------------------
        # TEST 11: ADMIN STOCK RECONCILIATION
        # -------------------------------------------------------------
        print("\n[TEST 11] Testing Admin Stock Reconciliation...")
        res_adj = client.post(
            "/api/admin/iot/inventory/adjust-stock",
            json={"device_id": test_device_id, "new_stock": 25, "notes": "Warehouse physical audit"}
        )
        assert res_adj.status_code == 200
        assert res_adj.json()["new_stock"] == 25
        
        res_check_adj = client.get(f"/api/iot/inventory/status?device_id={test_device_id}")
        assert res_check_adj.json()["current_stock"] == 25
        print("  [OK] Admin stock adjustment verified: reconciled to 25 items.")

        print("\n" + "=" * 75)
        print("ALL 11 TWO-SENSOR IOT INVENTORY TESTS PASSED SUCCESSFULLY! [OK]")
        print("=" * 75)

    finally:
        # Clean teardown
        db.query(models.IoTInventoryMovement).filter(
            models.IoTInventoryMovement.device_id.like("TEST-%")
        ).delete(synchronize_session=False)
        db.query(models.IoTInventoryState).filter(
            models.IoTInventoryState.device_id.like("TEST-%")
        ).delete(synchronize_session=False)
        db.commit()
        db.close()

if __name__ == "__main__":
    run_iot_inventory_test_suite()
