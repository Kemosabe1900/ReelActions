import os
from typing import Optional
from app.database import get_db
from app.services.downloader import download_audio, download_images, is_image_post
from app.services.transcriber import get_transcription_service, TranscriptionError
from app.services.classifier import get_classification_service, ClassificationError
from app.services.embedder import get_embedding_service, EmbeddingError
from app.services.frame_extractor import extract_frames_for_vision
from app.services.push import notify_user
from app.services.alerting import alert


class ProcessingError(Exception):
    pass


MAX_ATTEMPTS = 5
RETRY_DELAYS_SECONDS = [120, 600, 1800, 7200]

# Failures where retrying cannot help. Everything else is treated as
# transient (provider blocking, timeouts, rate limits) and retried.
PERMANENT_MARKERS = (
    "No speech or caption found",
)


class VideoProcessor:
    def __init__(self):
        self._supabase = get_db()
        self.transcriber = get_transcription_service()
        self.classifier = get_classification_service()
        self.embedder = get_embedding_service()

    def _delete_video(self, video_id: str):
        try:
            self._supabase.table("videos").delete().eq("id", video_id).execute()
        except Exception:
            pass

    def _update_job(self, job_id: str, status: str, error: str | None = None):
        from datetime import datetime, timezone

        data = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
        if error:
            data["error_message"] = error
        query = self._supabase.table("processing_jobs").update(data).eq("id", job_id)
        if status == "completed":
            # Never resurrect a job the API already declared failed.
            query = query.neq("status", "failed")
        query.execute()

    def _handle_failure(self, job_id: str, video_id: str, msg: str):
        """Reschedule transient failures with backoff; fail permanently otherwise.
        attempts was already incremented by claim_next_job() when the worker
        claimed this job."""
        from datetime import datetime, timezone, timedelta

        row = (
            self._supabase.table("processing_jobs")
            .select("attempts").eq("id", job_id).limit(1).execute()
        )
        attempts = MAX_ATTEMPTS
        if row.data and row.data[0].get("attempts"):
            attempts = row.data[0]["attempts"]

        permanent = any(marker in msg for marker in PERMANENT_MARKERS)
        if not permanent and attempts < MAX_ATTEMPTS:
            delay = RETRY_DELAYS_SECONDS[min(attempts - 1, len(RETRY_DELAYS_SECONDS) - 1)]
            next_retry = datetime.now(timezone.utc) + timedelta(seconds=delay)
            self._supabase.table("processing_jobs").update({
                "status": "pending",
                "error_message": msg,
                "next_retry_at": next_retry.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", job_id).execute()
            print(f"[processor] job {job_id} attempt {attempts} failed ({msg}), retrying in {delay}s")
            return

        self._update_job(job_id, "failed", msg)
        self._delete_video(video_id)
        alert(f"Job {job_id} failed after {attempts} attempt(s): {msg}")

    def _check_url_cache(self, video_url: str) -> dict | None:
        result = (
            self._supabase.table("videos")
            .select("transcript,structured_data,category,title,summary,schema_status")
            .eq("url", video_url)
            .limit(1)
            .execute()
        )
        rows = result.data
        if rows and rows[0].get("transcript"):
            return rows[0]
        return None

    def _get_existing_categories(self, user_id: str) -> list[str]:
        result = (
            self._supabase.table("videos")
            .select("category")
            .eq("user_id", user_id)
            .execute()
        )
        return list({row["category"] for row in result.data if row.get("category")})

    def process_video(self, job_id: str, video_id: str, video_url: str, user_id: str):
        audio_path = None
        video_path = None
        try:
            cached = self._check_url_cache(video_url)
            if cached:
                self._supabase.table("videos").update({
                    "transcript": cached["transcript"],
                    "category": cached["category"],
                    "title": cached["title"],
                    "summary": cached["summary"],
                    "structured_data": cached["structured_data"],
                    "schema_status": cached["schema_status"],
                }).eq("id", video_id).execute()
                self._update_job(job_id, "embedding")
                self.embedder.embed_and_store(video_id, cached["transcript"], user_id, title=cached.get("title"), category=cached.get("category"))
                self._update_job(job_id, "completed")
                notify_user(
                    user_id,
                    title="Save ready!",
                    body=cached.get("title") or "Your video has been added to your library.",
                    data={"video_id": video_id},
                )
                return

            self._update_job(job_id, "downloading")
            existing_categories = self._get_existing_categories(user_id)

            if is_image_post(video_url):
                images = download_images(video_url, job_id)

                self._update_job(job_id, "classifying")
                classification = self.classifier.classify(
                    transcript=None,
                    images=images,
                    existing_categories=existing_categories,
                )
                self._supabase.table("videos").update({
                    "category": classification.category,
                    "title": classification.title,
                    "summary": classification.summary,
                    "structured_data": classification.structured_data,
                    "schema_status": classification.schema_status,
                }).eq("id", video_id).execute()

                embed_text = f"{classification.title}\n\n{classification.summary}"
                self._update_job(job_id, "embedding")
                self.embedder.embed_and_store(
                    video_id,
                    embed_text,
                    user_id,
                    title=classification.title,
                    category=classification.category,
                )
            else:
                audio_path, caption, thumbnail_url, video_path = download_audio(video_url, job_id)

                self._update_job(job_id, "transcribing")
                transcript_result = self.transcriber.transcribe(audio_path, video_url=video_url)
                transcript_text = transcript_result.text.strip()

                # strip music/sound-only transcripts — not useful for classification
                import re as _re
                clean_transcript = _re.sub(r'[\[\(][^\]\)]*[\]\)]', '', transcript_text).strip()
                useful_transcript = clean_transcript if len(clean_transcript) >= 20 else None

                sections = []
                if useful_transcript:
                    sections.append(useful_transcript)
                if caption:
                    sections.append(f"Caption:\n{caption}")
                classify_text = "\n\n".join(sections) or None
                if not classify_text:
                    raise RuntimeError("No speech or caption found in this video — cannot classify")

                update_data: dict = {"transcript": transcript_text or caption}
                if thumbnail_url:
                    update_data["thumbnail_url"] = thumbnail_url
                self._supabase.table("videos").update(update_data).eq("id", video_id).execute()

                frames = extract_frames_for_vision(video_path, transcript_result.segments)

                self._update_job(job_id, "classifying")
                classification = self.classifier.classify(
                    transcript=classify_text,
                    images=frames or None,
                    existing_categories=existing_categories,
                )
                self._supabase.table("videos").update({
                    "category": classification.category,
                    "title": classification.title,
                    "summary": classification.summary,
                    "structured_data": classification.structured_data,
                    "schema_status": classification.schema_status,
                }).eq("id", video_id).execute()

                self._update_job(job_id, "embedding")
                self.embedder.embed_and_store(
                    video_id,
                    classify_text,
                    user_id,
                    title=classification.title,
                    category=classification.category,
                )

            self._update_job(job_id, "completed")
            notify_user(
                user_id,
                title="Save ready!",
                body=classification.title or "Your video has been added to your library.",
                data={"video_id": video_id},
            )

        except RuntimeError as e:
            self._handle_failure(job_id, video_id, f"Download failed: {str(e)}")
            raise ProcessingError(str(e))
        except TranscriptionError as e:
            self._handle_failure(job_id, video_id, f"Transcription failed: {str(e)}")
            raise ProcessingError(str(e))
        except ClassificationError as e:
            self._handle_failure(job_id, video_id, f"Classification failed: {str(e)}")
            raise ProcessingError(str(e))
        except EmbeddingError as e:
            self._handle_failure(job_id, video_id, f"Embedding failed: {str(e)}")
            raise ProcessingError(str(e))
        except Exception as e:
            self._handle_failure(job_id, video_id, f"Unexpected error: {str(e)}")
            raise ProcessingError(str(e))
        finally:
            for path in (audio_path, video_path):
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass


_video_processor: Optional[VideoProcessor] = None


def get_video_processor() -> VideoProcessor:
    global _video_processor
    if _video_processor is None:
        _video_processor = VideoProcessor()
    return _video_processor
