import re
from fastapi import APIRouter, Request, HTTPException
from app.database import get_db
from app.config import settings

router = APIRouter(tags=["webhooks"])

_STATUS_MAP = {
    "INITIAL_PURCHASE": "active",
    "RENEWAL": "active",
    "UNCANCELLATION": "active",
    "CANCELLATION": "cancelled",
    "EXPIRATION": "expired",
    "BILLING_ISSUES_DETECTED": "expired",
}

# profiles.id is a UUID. Anonymous RevenueCat ids ($RCAnonymousID:...) never map
# to a profile and would make the uuid comparison error, so skip them.
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def _set_status(user_id: str | None, status: str):
    if user_id and _UUID_RE.match(user_id):
        get_db().table("profiles").update({"subscription_status": status}).eq("id", user_id).execute()


@router.post("/webhooks/revenuecat", status_code=200)
async def revenuecat_webhook(request: Request):
    if not settings.revenuecat_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {settings.revenuecat_webhook_secret}":
        raise HTTPException(status_code=401)

    payload = await request.json()
    event = payload.get("event", {})
    event_type = event.get("type")

    # A purchase made before the user created an account is recorded under an
    # anonymous id; RevenueCat fires TRANSFER when it moves to the real user id
    # on login. Without this, that user's profile is never marked active and the
    # app strands them on the paywall after they sign in.
    if event_type == "TRANSFER":
        for uid in event.get("transferred_to") or []:
            _set_status(uid, "active")
        return {"ok": True}

    new_status = _STATUS_MAP.get(event_type)
    if new_status:
        _set_status(event.get("app_user_id"), new_status)

    return {"ok": True}
