import logging
import threading
from concurrent.futures import ThreadPoolExecutor

from app.database import get_db

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 3
MAX_CONCURRENT_JOBS = 3

_stop_event = threading.Event()
_thread: threading.Thread | None = None


def _claim_next() -> dict | None:
    result = get_db().rpc("claim_next_job", {}).execute()
    return result.data[0] if result.data else None


def _fail_job(job: dict, reason: str) -> None:
    get_db().table("processing_jobs").update({
        "status": "failed",
        "error_message": job.get("error_message") or reason,
    }).eq("id", job["id"]).execute()


def _process(job: dict) -> None:
    from app.workers.processor import get_video_processor, ProcessingError, MAX_ATTEMPTS

    if job["attempts"] > MAX_ATTEMPTS:
        _fail_job(job, "Processing failed after multiple attempts.")
        return
    if not job.get("video_id"):
        _fail_job(job, "Processing failed. Please try saving again.")
        return
    try:
        get_video_processor().process_video(
            job["id"], job["video_id"], job["video_url"], job["user_id"]
        )
    except ProcessingError:
        pass  # already handled: retry scheduled or job marked failed
    except Exception:
        logger.exception("[queue] unhandled error for job %s", job["id"])


def _loop() -> None:
    executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS)
    slots = threading.Semaphore(MAX_CONCURRENT_JOBS)
    logger.info("[queue] worker started (concurrency %d)", MAX_CONCURRENT_JOBS)

    while not _stop_event.is_set():
        slots.acquire()
        job = None
        try:
            job = _claim_next()
        except Exception:
            logger.exception("[queue] claim failed")
        if job is None:
            slots.release()
            _stop_event.wait(POLL_INTERVAL_SECONDS)
            continue

        def _run(j=job):
            try:
                _process(j)
            finally:
                slots.release()

        executor.submit(_run)

    executor.shutdown(wait=False)
    logger.info("[queue] worker stopped")


def start_worker() -> None:
    global _thread
    if _thread is not None:
        return
    _thread = threading.Thread(target=_loop, daemon=True, name="queue-worker")
    _thread.start()


def stop_worker() -> None:
    _stop_event.set()
