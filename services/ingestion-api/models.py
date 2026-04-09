from typing import Any

from pydantic import BaseModel, Field


class KeystrokeEvent(BaseModel):
    user_id_hash: str = Field(min_length=8)
    session_id: str = Field(min_length=8)
    timestamp_ms: int = Field(ge=0)
    dwell_ms: float = Field(ge=0)
    flight_ms_prev: float = Field(ge=0)
    device_metadata: dict[str, Any] | None = None


class VoiceSession(BaseModel):
    user_id_hash: str = Field(min_length=8)
    prompt_id: str = Field(min_length=2)
    recorded_at_ms: int = Field(ge=0)
    sample_rate_hz: int = Field(ge=8000)
    duration_s: float = Field(ge=1)
    f0_series_hz: list[float] = Field(default_factory=list)
    rms_series: list[float] = Field(default_factory=list)
    environment_quality_score: float | None = Field(default=None, ge=0, le=1)
