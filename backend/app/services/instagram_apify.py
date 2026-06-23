import logging
import os
import tempfile

import httpx

logger = logging.getLogger(__name__)

ACTOR_ID = "xMc5Ga1oCONPmWJIa"  # apify/instagram-reel-scraper
APIFY_BASE = "https://api.apify.com/v2"


def download_instagram_audio(url: str, job_id: str) -> tuple[str, str, str | None]:
    """Download Instagram Reel via Apify. Returns (raw_video_path, caption, thumbnail_url)."""
    from app.config import settings

    if not settings.apify_api_token:
        raise RuntimeError("APIFY_API_TOKEN not configured")

    headers = {"Authorization": f"Bearer {settings.apify_api_token}"}
    run_input = {
        "username": [url],
        "resultsLimit": 1,
        "includeDownloadedVideo": True,
    }

    with httpx.Client(timeout=180) as client:
        resp = client.post(
            f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items",
            json=run_input,
            headers=headers,
            params={"timeout": 120},
        )
        if resp.status_code >= 400:
            raise RuntimeError(
                f"Apify run failed ({resp.status_code}): {resp.text[:500]}"
            )
        items = resp.json()

    if not items:
        raise RuntimeError("Apify returned no results for URL")

    post = items[0]
    video_url = post.get("downloadedVideo") or post.get("videoUrl")
    if not video_url:
        raise RuntimeError("No video URL in Apify response")

    caption = post.get("caption") or ""
    thumbnail_url = post.get("displayUrl") or None

    raw_path = os.path.join(tempfile.gettempdir(), f"{job_id}_ig_apify.mp4")
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        with client.stream("GET", video_url) as response:
            response.raise_for_status()
            with open(raw_path, "wb") as f:
                for chunk in response.iter_bytes(chunk_size=8192):
                    f.write(chunk)

    logger.info("[instagram_apify] downloaded %s", raw_path)
    return raw_path, caption, thumbnail_url
