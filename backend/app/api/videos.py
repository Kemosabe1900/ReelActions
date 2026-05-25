import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.database import get_db
from app.workers.processor import get_video_processor
from app.limiter import limiter

router = APIRouter(tags=["videos"])


class SubmitVideoRequest(BaseModel):
    url: str


class SubmitVideoResponse(BaseModel):
    job_id: str
    video_id: str


@router.post("/videos", response_model=SubmitVideoResponse, status_code=202)
@limiter.limit("20/hour")
def submit_video(
    request: Request,
    body: SubmitVideoRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    if not ("tiktok.com" in body.url or "instagram.com" in body.url):
        raise HTTPException(status_code=422, detail="URL must be from TikTok or Instagram")

    db = get_db()

    existing = (
        db.table("videos").select("id").eq("user_id", user_id).eq("url", body.url).limit(1).execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="You've already saved this video")

    video_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    db.table("videos").insert({"id": video_id, "user_id": user_id, "url": body.url}).execute()
    db.table("processing_jobs").insert({
        "id": job_id, "user_id": user_id, "video_url": body.url, "status": "pending",
    }).execute()

    processor = get_video_processor()
    background_tasks.add_task(processor.process_video, job_id, video_id, body.url, user_id)

    return SubmitVideoResponse(job_id=job_id, video_id=video_id)


@router.get("/videos")
def list_videos(
    category: str | None = Query(None),
    tried: bool | None = Query(None),
    user_id: str = Depends(get_current_user),
):
    db = get_db()
    query = db.table("videos").select("*").eq("user_id", user_id).order("created_at", desc=True)
    if category is not None:
        if category == "Uncategorized":
            query = query.is_("category", "null")
        else:
            query = query.eq("category", category)
    if tried is not None:
        query = query.eq("tried", tried)
    result = query.execute()
    return result.data


@router.get("/videos/{video_id}")
def get_video(video_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("videos").select("*")
        .eq("id", video_id).eq("user_id", user_id)
        .limit(1).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Video not found")
    return result.data[0]


@router.delete("/videos/{video_id}", status_code=204)
def delete_video(video_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    exists = (
        db.table("videos").select("id")
        .eq("id", video_id).eq("user_id", user_id)
        .limit(1).execute()
    )
    if not exists.data:
        raise HTTPException(status_code=404, detail="Video not found")
    db.table("transcript_chunks").delete().eq("video_id", video_id).execute()
    db.table("videos").delete().eq("id", video_id).eq("user_id", user_id).execute()


class UpdateVideoRequest(BaseModel):
    title: str


@router.patch("/videos/{video_id}")
def update_video(video_id: str, body: UpdateVideoRequest, user_id: str = Depends(get_current_user)):
    db = get_db()
    exists = (
        db.table("videos").select("id")
        .eq("id", video_id).eq("user_id", user_id)
        .limit(1).execute()
    )
    if not exists.data:
        raise HTTPException(status_code=404, detail="Video not found")
    result = (
        db.table("videos").update({"title": body.title})
        .eq("id", video_id).eq("user_id", user_id)
        .execute()
    )
    return result.data[0]


@router.patch("/videos/{video_id}/tried")
def toggle_tried(video_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    fetch = (
        db.table("videos").select("tried,tried_count")
        .eq("id", video_id).eq("user_id", user_id)
        .limit(1).execute()
    )
    if not fetch.data:
        raise HTTPException(status_code=404, detail="Video not found")

    current = fetch.data[0]
    new_tried = not current["tried"]
    new_count = current["tried_count"] + 1 if new_tried else current["tried_count"]

    tried_at_value = datetime.now(timezone.utc).isoformat() if new_tried else None

    result = (
        db.table("videos").update({"tried": new_tried, "tried_count": new_count, "tried_at": tried_at_value})
        .eq("id", video_id).eq("user_id", user_id)
        .execute()
    )
    return result.data[0]
