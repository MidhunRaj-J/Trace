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

    def summary(self, user_id_hash: str) -> dict:
        return {
            "user_id_hash": user_id_hash,
            "keystroke_event_count": len(self.keystroke_events[user_id_hash]),
            "voice_session_count": len(self.voice_sessions[user_id_hash]),
        }
