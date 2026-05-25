import httpx
from app.database import get_db

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def get_push_tokens(user_id: str) -> list[str]:
    db = get_db()
    result = db.table("push_tokens").select("token").eq("user_id", user_id).execute()
    return [row["token"] for row in result.data]


def send_push_notification(token: str, title: str, body: str, data: dict | None = None) -> None:
    payload: dict = {"to": token, "title": title, "body": body, "sound": "default"}
    if data:
        payload["data"] = data
    try:
        with httpx.Client(timeout=10) as client:
            client.post(
                EXPO_PUSH_URL,
                json=[payload],
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
    except Exception:
        pass


def notify_user(user_id: str, title: str, body: str, data: dict | None = None) -> None:
    for token in get_push_tokens(user_id):
        send_push_notification(token, title, body, data)
