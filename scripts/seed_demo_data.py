from __future__ import annotations

import json
import random
import time
import urllib.error
import urllib.request

INGESTION_URL = "http://localhost:8010"
USER_ID = "demo_user_001"
DAY_COUNT = 30


def post_json(url: str, payload: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310
        return json.loads(resp.read().decode("utf-8"))


def delete(url: str) -> dict:
    req = urllib.request.Request(url, method="DELETE")
    with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310
        return json.loads(resp.read().decode("utf-8"))


def build_demo_rows(day_count: int) -> list[dict]:
    random.seed(1707)
    start_ts = int(time.time() * 1000) - (day_count * 24 * 60 * 60 * 1000)
    rows: list[dict] = []

    for i in range(day_count):
        drift_step = (i - 18) * 1.6 if i > 18 else 0.0
        dwell_ms = 101 + drift_step + random.uniform(-3, 3)
        flight_ms_prev = 76 + (drift_step * 0.65) + random.uniform(-2.5, 2.5)
        quality = max(0.0, min(1.0, 0.96 - (i * 0.005) + random.uniform(-0.015, 0.015)))

        rows.append(
            {
                "session_id": f"session_{i:03d}",
                "timestamp_ms": start_ts + (i * 24 * 60 * 60 * 1000),
                "dwell_ms": round(dwell_ms, 3),
                "flight_ms_prev": round(flight_ms_prev, 3),
                "quality": round(quality, 3),
            }
        )

    return rows


def seed_data() -> None:
    print(f"Resetting data for {USER_ID}...")
    delete(f"{INGESTION_URL}/v1/users/{USER_ID}")

    rows = build_demo_rows(DAY_COUNT)
    for row in rows:
        post_json(
            f"{INGESTION_URL}/v1/keystroke/events",
            {
                "user_id_hash": USER_ID,
                "session_id": row["session_id"],
                "timestamp_ms": row["timestamp_ms"],
                "dwell_ms": row["dwell_ms"],
                "flight_ms_prev": row["flight_ms_prev"],
            },
        )

        post_json(
            f"{INGESTION_URL}/v1/voice/sessions",
            {
                "user_id_hash": USER_ID,
                "prompt_id": "weekly_ah",
                "recorded_at_ms": row["timestamp_ms"],
                "sample_rate_hz": 16000,
                "duration_s": 5.0,
                "f0_series_hz": [128.2, 130.3, 129.8],
                "rms_series": [0.29, 0.31, 0.28],
                "environment_quality_score": row["quality"],
            },
        )

    print(f"Seeded {len(rows)} days of demo events for {USER_ID}.")


if __name__ == "__main__":
    try:
        seed_data()
    except urllib.error.URLError as exc:
        print("Failed to seed demo data. Is ingestion API running at http://localhost:8010?")
        raise SystemExit(1) from exc
