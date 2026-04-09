# Scoring Service

Minimal service for turning feature deviations into bounded risk scores.

## Run

```powershell
cd services/scoring-service
uvicorn main:app --reload --port 8020
```

## Endpoints

- `GET /health`
- `POST /v1/drift`
- `POST /v1/fusion`
