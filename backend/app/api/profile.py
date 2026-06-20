from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.database import get_db

router = APIRouter(tags=["profile"])


def _tried_dates(tried_at_values: list) -> set:
    dates = set()
    for val in tried_at_values:
        if val:
            try:
                d = datetime.fromisoformat(val.replace('Z', '+00:00')).date()
                dates.add(d)
            except Exception:
                pass
    return dates


def calculate_streak(tried_at_values: list) -> int:
    dates = _tried_dates(tried_at_values)
    if not dates:
        return 0

    today = datetime.now(timezone.utc).date()
    start = today if today in dates else today - timedelta(days=1)
    if start not in dates:
        return 0

    streak = 0
    current = start
    while current in dates:
        streak += 1
        current -= timedelta(days=1)
    return streak




@router.get("/profile")
def get_profile(user_id: str = Depends(get_current_user)):
    db = get_db()
    profile_result = (
        db.table("profiles").select("*")
        .eq("id", user_id).limit(1).execute()
    )

    if not profile_result.data:
        db.table("profiles").upsert({"id": user_id}, on_conflict="id").execute()
        profile_result = (
            db.table("profiles").select("*")
            .eq("id", user_id).limit(1).execute()
        )

    videos_result = db.table("videos").select("tried,tried_at").eq("user_id", user_id).execute()
    total = len(videos_result.data)
    tried = sum(1 for v in videos_result.data if v["tried"])
    tried_at_values = [v["tried_at"] for v in videos_result.data if v.get("tried_at")]
    streak = calculate_streak(tried_at_values)

    email = None
    try:
        user_response = db.auth.admin.get_user_by_id(user_id)
        email = user_response.user.email if user_response.user else None
    except BaseException:
        pass

    return {
        **profile_result.data[0],
        "current_streak": streak,
        "tried_at_values": tried_at_values,
        "explorer_tried": tried,
        "explorer_total": total,
        "email": email,
    }


class ProfileUpdate(BaseModel):
    display_name: str


@router.patch("/profile")
def update_profile(body: ProfileUpdate, user_id: str = Depends(get_current_user)):
    db = get_db()
    db.table("profiles").update({"display_name": body.display_name.strip()}).eq("id", user_id).execute()
    return {"ok": True}


class TimezoneUpdate(BaseModel):
    timezone: str


@router.patch("/profile/timezone")
def update_timezone(body: TimezoneUpdate, user_id: str = Depends(get_current_user)):
    db = get_db()
    db.table("profiles").update({"timezone": body.timezone.strip()}).eq("id", user_id).execute()
    return {"ok": True}


@router.delete("/account", status_code=204)
def delete_account(user_id: str = Depends(get_current_user)):
    db = get_db()
    db.table("push_tokens").delete().eq("user_id", user_id).execute()
    db.auth.admin.delete_user(user_id)
