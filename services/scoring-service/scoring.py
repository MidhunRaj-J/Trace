from __future__ import annotations

import math


def z_score(value: float, baseline_mean: float, baseline_std: float) -> float:
    std = max(baseline_std, 1e-6)
    return (value - baseline_mean) / std


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def drift_probability(z: float) -> float:
    # Sigmoid over absolute z-score to map deviation to a bounded risk score.
    return clamp01(1.0 / (1.0 + math.exp(-(abs(z) - 1.0))))


def fuse_modalities(keystroke_risk: float, voice_risk: float, voice_quality: float = 1.0) -> dict:
    voice_weight = 0.5 * clamp01(voice_quality)
    keystroke_weight = 1.0 - voice_weight
    composite = (keystroke_risk * keystroke_weight) + (voice_risk * voice_weight)
    return {
        "composite_risk": clamp01(composite),
        "keystroke_weight": keystroke_weight,
        "voice_weight": voice_weight,
    }
