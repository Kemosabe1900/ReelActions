from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.database import get_db

router = APIRouter(tags=["jobs"])

# The queue worker owns the job lifecycle: it reclaims stalled jobs and
# reschedules transient failures with backoff (a job can legitimately sit
# in 'pending' for hours between retries). This endpoint only reports state,
# with one backstop: a job still not terminal 6 hours after creation is dead
# (retry window maxes out around 3h), so fail it rather than spin forever.
BACKSTOP_AFTER_SECONDS = 6 * 3600
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
        created_at = datetime.fromisoformat(job["created_at"].replace("Z", "+00:00"))
        elapsed = datetime.now(timezone.utc) - created_at
        if elapsed > timedelta(seconds=BACKSTOP_AFTER_SECONDS):
            db.table("processing_jobs").update({
                "status": "failed",
                "error_message": "Processing timed out. Please try again.",
            }).eq("id", job_id).execute()
            job["status"] = "failed"
            job["error_message"] = "Processing timed out. Please try again."

    return job
