from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.database import get_db

router = APIRouter(tags=["jobs"])

# A live job heartbeats via updated_at on every stage transition. The longest
# silent stretch is the download stage (yt-dlp + Apify retry ~510s), so only
# a job silent for longer than that is actually dead (e.g. killed by a deploy).
STALE_AFTER_SECONDS = 600
TERMINAL_STATUSES = {"completed", "failed"}


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = (
        db.table("processing_jobs").select("*")
        .eq("id", job_id).eq("user_id", user_id)
        .limit(1).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = result.data[0]

    if job["status"] not in TERMINAL_STATUSES:
        last_beat = job.get("updated_at") or job["created_at"]
        beat_at = datetime.fromisoformat(last_beat.replace("Z", "+00:00"))
        elapsed = datetime.now(timezone.utc) - beat_at
        if elapsed > timedelta(seconds=STALE_AFTER_SECONDS):
            db.table("processing_jobs").update({
                "status": "failed",
                "error_message": "Processing timed out. Please try again.",
            }).eq("id", job_id).execute()
            job["status"] = "failed"
            job["error_message"] = "Processing timed out. Please try again."

    return job
