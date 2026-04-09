from __future__ import annotations

import math
from statistics import median


def _safe_iqr(values: list[float]) -> float:
    if len(values) < 4:
        return 0.0
    ordered = sorted(values)
    q1_idx = int(0.25 * (len(ordered) - 1))
    q3_idx = int(0.75 * (len(ordered) - 1))
    return float(ordered[q3_idx] - ordered[q1_idx])


def keystroke_features(events: list[dict]) -> dict:
    dwell = [float(e["dwell_ms"]) for e in events]
    flight = [float(e["flight_ms_prev"]) for e in events]
    if not dwell or not flight:
        return {
            "sample_count": 0,
            "dwell_median_ms": 0.0,
            "dwell_iqr_ms": 0.0,
            "flight_median_ms": 0.0,
            "flight_iqr_ms": 0.0,
        }

    return {
        "sample_count": len(events),
        "dwell_median_ms": float(median(dwell)),
        "dwell_iqr_ms": _safe_iqr(dwell),
        "flight_median_ms": float(median(flight)),
        "flight_iqr_ms": _safe_iqr(flight),
    }


def _safe_cv(values: list[float]) -> float:
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    if math.isclose(mean, 0.0):
        return 0.0
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return float(math.sqrt(variance) / mean)


def voice_features(session: dict) -> dict:
    f0 = [float(x) for x in session.get("f0_series_hz", []) if x > 0]
    rms = [float(x) for x in session.get("rms_series", []) if x >= 0]

    jitter_local = _safe_cv(f0)
    shimmer_local = _safe_cv(rms)

    return {
        "f0_count": len(f0),
        "rms_count": len(rms),
        "jitter_local": jitter_local,
        "shimmer_local": shimmer_local,
        "quality_score": float(session.get("environment_quality_score", 1.0)),
    }
