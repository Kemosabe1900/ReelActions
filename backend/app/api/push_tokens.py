from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter()


class PushTokenRequest(BaseModel):
    token: str


@router.post("/push-tokens", status_code=204)
def register_push_token(body: PushTokenRequest, user_id: str = Depends(get_current_user)):
    db = get_db()
    db.table("push_tokens").upsert(
        {"user_id": user_id, "token": body.token},
        on_conflict="user_id,token",
    ).execute()
