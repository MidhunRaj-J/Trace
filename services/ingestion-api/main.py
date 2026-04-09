from fastapi import FastAPI

from models import KeystrokeEvent, VoiceSession
from store import InMemoryStore

app = FastAPI(title="Trace Ingestion API", version="0.1.0")
store = InMemoryStore()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/keystroke/events")
def ingest_keystroke_event(event: KeystrokeEvent) -> dict:
    store.add_keystroke_event(event.user_id_hash, event.model_dump())
    return {
        "accepted": True,
        "message": "keystroke event stored",
        "user_summary": store.summary(event.user_id_hash),
    }


@app.post("/v1/voice/sessions")
def ingest_voice_session(session: VoiceSession) -> dict:
    store.add_voice_session(session.user_id_hash, session.model_dump())
    return {
        "accepted": True,
        "message": "voice session stored",
        "user_summary": store.summary(session.user_id_hash),
    }


@app.get("/v1/users/{user_id_hash}/summary")
def user_summary(user_id_hash: str) -> dict:
    return store.summary(user_id_hash)
