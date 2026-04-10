from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import KeystrokeEvent, VoiceSession
from store import InMemoryStore

app = FastAPI(title="Trace Ingestion API", version="0.1.0")
store = InMemoryStore()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/v1/users/{user_id_hash}/keystroke/events")
def user_keystroke_events(user_id_hash: str, limit: int = 0) -> dict:
    events = store.get_keystroke_events(user_id_hash, limit)
    return {
        "user_id_hash": user_id_hash,
        "count": len(events),
        "events": events,
    }


@app.get("/v1/users/{user_id_hash}/voice/sessions")
def user_voice_sessions(user_id_hash: str, limit: int = 0) -> dict:
    sessions = store.get_voice_sessions(user_id_hash, limit)
    return {
        "user_id_hash": user_id_hash,
        "count": len(sessions),
        "sessions": sessions,
    }


@app.delete("/v1/users/{user_id_hash}")
def reset_user_data(user_id_hash: str) -> dict:
    return {
        "reset": True,
        "details": store.reset_user(user_id_hash),
    }
