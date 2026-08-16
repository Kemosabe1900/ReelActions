import logging

import httpx

from app.database import get_db

logger = logging.getLogger(__name__)

THUMBNAIL_BUCKET = "thumbnails"


def upload_thumbnail_from_url(source_url: str, video_id: str) -> str | None:
    """Fetch an image from a remote URL (e.g. Instagram/TikTok CDN) and re-host
    it in Supabase Storage. Returns the public URL, or None on any failure."""
    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            resp = client.get(source_url)
            resp.raise_for_status()
            image_bytes = resp.content
    except Exception as e:
        logger.warning("[thumbnails] fetch failed for video %s: %s", video_id, e)
        return None
    return _upload(image_bytes, video_id)


def upload_thumbnail_from_bytes(image_bytes: bytes, video_id: str) -> str | None:
    """Re-host an already-extracted frame in Supabase Storage. Returns the
    public URL, or None on any failure."""
    return _upload(image_bytes, video_id)


def _upload(image_bytes: bytes, video_id: str) -> str | None:
    path = f"{video_id}.jpg"
    try:
        client = get_db()
        client.storage.from_(THUMBNAIL_BUCKET).upload(
            path,
            image_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
        return client.storage.from_(THUMBNAIL_BUCKET).get_public_url(path)
    except Exception as e:
        logger.warning("[thumbnails] upload failed for video %s: %s", video_id, e)
        return None
