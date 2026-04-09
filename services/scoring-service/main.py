from fastapi import FastAPI
from pydantic import BaseModel, Field

from scoring import drift_probability, fuse_modalities, z_score

app = FastAPI(title="Trace Scoring Service", version="0.1.0")


class DriftRequest(BaseModel):
    value: float
    baseline_mean: float
    baseline_std: float = Field(gt=0)


class FuseRequest(BaseModel):
    keystroke_risk: float = Field(ge=0, le=1)
    voice_risk: float = Field(ge=0, le=1)
    voice_quality: float = Field(default=1.0, ge=0, le=1)


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
