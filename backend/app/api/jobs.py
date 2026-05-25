from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.database import get_db

router = APIRouter(tags=["jobs"])

JOB_TIMEOUT_SECONDS = 90
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
        if elapsed > timedelta(seconds=JOB_TIMEOUT_SECONDS):
            db.table("processing_jobs").update({
                "status": "failed",
                "error_message": "Processing timed out. Please try again.",
            }).eq("id", job_id).execute()
            job["status"] = "failed"
            job["error_message"] = "Processing timed out. Please try again."

    return job
