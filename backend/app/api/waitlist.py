from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.limiter import limiter

router = APIRouter()


class WaitlistRequest(BaseModel):
    email: EmailStr


@router.post("/waitlist", status_code=201)
@limiter.limit("5/hour")
def join_waitlist(request: Request, body: WaitlistRequest):
    db = get_db()
    existing = db.table("waitlist").select("id").eq("email", body.email).limit(1).execute()
    if existing.data:
        return {"status": "already_registered"}
    db.table("waitlist").insert({"email": body.email}).execute()
    return {"status": "ok"}


@router.get("/waitlist/count")
def waitlist_count():
    db = get_db()
    result = db.table("waitlist").select("id", count="exact").execute()
    return {"count": result.count or 0}
