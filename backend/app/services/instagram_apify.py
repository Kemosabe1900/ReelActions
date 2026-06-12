import logging
import os
import tempfile

import httpx

logger = logging.getLogger(__name__)

ACTOR_ID = "xMc5Ga1oCONPmWJIa"
APIFY_BASE = "https://api.apify.com/v2"


def download_instagram_audio(url: str, job_id: str) -> tuple[str, str, str | None]:
    """Download Instagram Reel via Apify. Returns (raw_video_path, caption, thumbnail_url)."""
    from app.config import settings

    if not settings.apify_api_token:
        raise RuntimeError("APIFY_API_TOKEN not configured")

    headers = {"Authorization": f"Bearer {settings.apify_api_token}"}

    with httpx.Client(timeout=180) as client:
        run_resp = client.post(
            f"{APIFY_BASE}/actors/{ACTOR_ID}/runs",
            json={"startUrls": [url]},
            headers=headers,
            params={"waitSecs": 120},
        )
        run_resp.raise_for_status()
        run = run_resp.json().get("data", {})

        status = run.get("status")
        dataset_id = run.get("defaultDatasetId")

        if status not in ("SUCCEEDED", "FINISHED"):
            raise RuntimeError(f"Apify run ended with status: {status}")
        if not dataset_id:
            raise RuntimeError("No dataset ID from Apify run")

        items_resp = client.get(
            f"{APIFY_BASE}/datasets/{dataset_id}/items",
            headers=headers,
        )
        items_resp.raise_for_status()
        items = items_resp.json()

    if not items:
        raise RuntimeError("Apify returned no results for URL")

    post = items[0]
    video_url = post.get("downloadedVideo")
    if not video_url:
        raise RuntimeError("No downloadedVideo in Apify response")

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
