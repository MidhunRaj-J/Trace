from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from scoring import drift_probability, fuse_modalities, trend_risk_series, z_score

app = FastAPI(title="Trace Scoring Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DriftRequest(BaseModel):
    value: float
    baseline_mean: float
    baseline_std: float = Field(gt=0)


class FuseRequest(BaseModel):
    keystroke_risk: float = Field(ge=0, le=1)
    voice_risk: float = Field(ge=0, le=1)
    voice_quality: float = Field(default=1.0, ge=0, le=1)


class TrendRequest(BaseModel):
    series: list[float] = Field(min_length=3)
    baseline_window: int = Field(default=7, ge=3, le=30)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/drift")
def score_drift(payload: DriftRequest) -> dict:
    z = z_score(payload.value, payload.baseline_mean, payload.baseline_std)
    return {
        "z_score": z,
        "drift_probability": drift_probability(z),
    }


@app.post("/v1/fusion")
def score_fusion(payload: FuseRequest) -> dict:
    return fuse_modalities(payload.keystroke_risk, payload.voice_risk, payload.voice_quality)


@app.post("/v1/trend")
def score_trend(payload: TrendRequest) -> dict:
    return trend_risk_series(payload.series, payload.baseline_window)
