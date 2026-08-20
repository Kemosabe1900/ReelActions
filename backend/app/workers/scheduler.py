import random
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.database import get_db
from app.services.push import notify_user
from app.api.profile import calculate_streak

# Users who haven't reported a timezone yet (old builds) default to US Eastern.
DEFAULT_TZ = "America/New_York"
REMINDER_LOCAL_HOUR = 18  # 6 PM local


def _users_with_tokens_and_tz() -> list[tuple[str, str]]:
    db = get_db()
    token_rows = db.table("push_tokens").select("user_id").execute().data
    user_ids = list({row["user_id"] for row in token_rows})
    if not user_ids:
        return []
    profiles = (
        db.table("profiles").select("id,timezone").in_("id", user_ids).execute().data
    )
    tz_by_id = {p["id"]: (p.get("timezone") or DEFAULT_TZ) for p in profiles}
    return [(uid, tz_by_id.get(uid, DEFAULT_TZ)) for uid in user_ids]


def _local_now(tz_name: str) -> datetime | None:
    try:
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return None


def _tried_today_local(user_id: str, now_local: datetime) -> bool:
    midnight_utc = (
        now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        .astimezone(timezone.utc)
        .isoformat()
    )
    db = get_db()
    result = (
        db.table("videos")
        .select("id")
        .eq("user_id", user_id)
        .eq("tried", True)
        .gte("tried_at", midnight_utc)
        .limit(1)
        .execute()
    )
    return len(result.data) > 0


def _streak_message(user_id: str) -> tuple[str, str]:
    db = get_db()
    rows = (
        db.table("videos")
        .select("title,tried,tried_at")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
        .data
    )
    if not rows:
        return ("Start your streak", "Add your first save to get going.")

    tried_at_values = [r["tried_at"] for r in rows if r.get("tried_at")]
    streak = calculate_streak(tried_at_values)
    untried = [r["title"] for r in rows if not r["tried"] and r.get("title")]

    # Only claim a streak is "alive" if one actually exists — same
    # calculate_streak() the profile screen shows, so this never says
    # something the user's own stats page would contradict.
    if streak > 0:
        title = f"Keep your {streak}-day streak alive"
    else:
        title = "Start a streak"

    if untried:
        return (title, f"Try {random.choice(untried)} today.")
    return (title, "Try a save today.")


def _saved_count_this_week(user_id: str) -> int:
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    db = get_db()
    result = (
        db.table("videos")
        .select("id")
        .eq("user_id", user_id)
        .gte("created_at", f"{week_ago}T00:00:00")
        .execute()
    )
    return len(result.data)


def _claim_reminder_slot(user_id: str, today_str: str) -> bool:
    """Atomically claims today's reminder for this user via a conditional
    UPDATE, so if more than one app instance is alive during the target hour
    (e.g. a Railway redeploy overlapping 6 PM local), only one instance's
    send wins instead of the user getting a notification from each."""
    db = get_db()
    result = (
        db.table("profiles")
        .update({"last_streak_notified_date": today_str})
        .eq("id", user_id)
        .or_(f"last_streak_notified_date.is.null,last_streak_notified_date.neq.{today_str}")
        .execute()
    )
    return bool(result.data)


def run_streak_reminder():
    """Runs hourly; notifies each user once at their local 6 PM if they
    haven't tried a save yet today (in their own timezone)."""
    for user_id, tz_name in _users_with_tokens_and_tz():
        now_local = _local_now(tz_name)
        if now_local is None or now_local.hour != REMINDER_LOCAL_HOUR:
            continue
        if _tried_today_local(user_id, now_local):
            continue
        if not _claim_reminder_slot(user_id, now_local.date().isoformat()):
            continue
        title, body = _streak_message(user_id)
        notify_user(user_id, title=title, body=body)


def run_weekly_recap():
    for user_id, _ in _users_with_tokens_and_tz():
        count = _saved_count_this_week(user_id)
        if count > 0:
            notify_user(
                user_id,
                title="Your week in ReelActions",
                body=f"{count} save{'s' if count != 1 else ''} this week. Nice work.",
            )
