# Ingestion API

Minimal FastAPI service for receiving privacy-safe keystroke timing and voice session payloads.

## Run

```powershell
cd services/ingestion-api
uvicorn main:app --reload --port 8010
```

## Endpoints

- `GET /health`
- `POST /v1/keystroke/events`
- `POST /v1/voice/sessions`
- `GET /v1/users/{user_id_hash}/summary`
