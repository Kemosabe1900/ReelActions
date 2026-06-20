from datetime import date
from app.database import get_db
from app.services.push import notify_user


def _get_all_users_with_tokens() -> list[str]:
    db = get_db()
    result = db.table("push_tokens").select("user_id").execute()
    return list({row["user_id"] for row in result.data})


def _tried_something_today(user_id: str) -> bool:
    db = get_db()
    today = date.today().isoformat()
    result = (
        db.table("videos")
        .select("id")
        .eq("user_id", user_id)
        .eq("tried", True)
        .gte("tried_at", f"{today}T00:00:00")
        .limit(1)
        .execute()
    )
    return len(result.data) > 0


def _saved_count_this_week(user_id: str) -> int:
    from datetime import timedelta
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


def run_streak_reminder():
    for user_id in _get_all_users_with_tokens():
        if not _tried_something_today(user_id):
            notify_user(
                user_id,
                title="Keep your streak alive",
                body="Try a save today.",
            )


def run_weekly_recap():
    for user_id in _get_all_users_with_tokens():
        count = _saved_count_this_week(user_id)
        if count > 0:
            notify_user(
                user_id,
                title="Your week in ReelActions",
                body=f"{count} save{'s' if count != 1 else ''} this week. Nice work.",
            )
