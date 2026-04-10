from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class InMemoryStore:
    keystroke_events: dict[str, list[dict]] = field(default_factory=lambda: defaultdict(list))
    voice_sessions: dict[str, list[dict]] = field(default_factory=lambda: defaultdict(list))

    def add_keystroke_event(self, user_id_hash: str, payload: dict) -> None:
        self.keystroke_events[user_id_hash].append(payload)

    def add_voice_session(self, user_id_hash: str, payload: dict) -> None:
        self.voice_sessions[user_id_hash].append(payload)

    def get_keystroke_events(self, user_id_hash: str, limit: int | None = None) -> list[dict]:
        events = self.keystroke_events[user_id_hash]
        if limit is None or limit <= 0:
            return events
        return events[-limit:]

    def get_voice_sessions(self, user_id_hash: str, limit: int | None = None) -> list[dict]:
        sessions = self.voice_sessions[user_id_hash]
        if limit is None or limit <= 0:
            return sessions
        return sessions[-limit:]

    def reset_user(self, user_id_hash: str) -> dict:
        keystroke_count = len(self.keystroke_events[user_id_hash])
        voice_count = len(self.voice_sessions[user_id_hash])
        self.keystroke_events[user_id_hash].clear()
        self.voice_sessions[user_id_hash].clear()
        return {
            "user_id_hash": user_id_hash,
            "deleted_keystroke_events": keystroke_count,
            "deleted_voice_sessions": voice_count,
        }

    def summary(self, user_id_hash: str) -> dict:
        return {
            "user_id_hash": user_id_hash,
            "keystroke_event_count": len(self.keystroke_events[user_id_hash]),
            "voice_session_count": len(self.voice_sessions[user_id_hash]),
        }
