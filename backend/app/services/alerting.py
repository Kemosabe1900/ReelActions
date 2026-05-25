import httpx
from app.config import settings


def alert(message: str, event_type: str = "error", ip: str | None = None) -> None:
    _store_event(event_type, message, ip)
    if not settings.slack_webhook_url:
        return
    try:
        with httpx.Client(timeout=5) as client:
            client.post(settings.slack_webhook_url, json={"content": f"🚨 ReelActions: {message}"})
    except Exception:
        pass


def _store_event(event_type: str, message: str, ip: str | None) -> None:
    try:
        from app.database import get_db
        get_db().table("admin_events").insert({
            "type": event_type,
            "message": message,
            "ip": ip,
        }).execute()
    except Exception:
        pass
