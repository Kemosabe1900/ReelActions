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


@router.post("/webhooks/revenuecat", status_code=200)
async def revenuecat_webhook(request: Request):
    if settings.revenuecat_webhook_secret:
        auth = request.headers.get("Authorization", "")
        if auth != f"Bearer {settings.revenuecat_webhook_secret}":
            raise HTTPException(status_code=401)

    payload = await request.json()
    event = payload.get("event", {})
    event_type = event.get("type")
    user_id = event.get("app_user_id")

    new_status = _STATUS_MAP.get(event_type)
    if new_status and user_id:
        get_db().table("profiles").update({"subscription_status": new_status}).eq("id", user_id).execute()

    return {"ok": True}
