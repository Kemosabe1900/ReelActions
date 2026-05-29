import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)


def alert(message: str, event_type: str = "error", ip: str | None = None) -> None:
    logger.error("[ALERT] %s", message)
    _store_event(event_type, message, ip)
    if not settings.discord_webhook_url:
        logger.warning("[ALERT] discord_webhook_url not set, skipping Discord notification")
        return
    try:
        with httpx.Client(timeout=5) as client:
            resp = client.post(settings.discord_webhook_url, json={"content": f"🚨 ReelActions: {message}"})
            if resp.status_code >= 400:
                logger.error("[ALERT] Discord webhook returned %s: %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("[ALERT] Discord webhook failed: %s", e)


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
