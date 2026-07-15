import logging
import os
import tempfile

import httpx

logger = logging.getLogger(__name__)

ACTOR_ID = "xMc5Ga1oCONPmWJIa"  # apify/instagram-reel-scraper
FALLBACK_ACTOR = "apify~instagram-scraper"  # different infra, often unblocked when the reel scraper is
APIFY_BASE = "https://api.apify.com/v2"


def _try_fallback_actor(url: str, headers: dict) -> dict | None:
    run_input = {"directUrls": [url], "resultsType": "details", "addParentData": False}
    try:
        with httpx.Client(timeout=300) as client:
            resp = client.post(
                f"{APIFY_BASE}/acts/{FALLBACK_ACTOR}/run-sync-get-dataset-items",
                json=run_input,
                headers=headers,
                params={"timeout": 240},
            )
            if resp.status_code >= 400:
                logger.warning("[instagram_apify] fallback actor failed (%s): %s", resp.status_code, resp.text[:200])
                return None
            items = resp.json()
            if not items or items[0].get("error"):
                logger.warning("[instagram_apify] fallback actor also blocked: %s", items[0] if items else "empty")
                return None
            if not (items[0].get("downloadedVideo") or items[0].get("videoUrl")):
                logger.warning("[instagram_apify] fallback actor returned no video URL")
                return None
            logger.info("[instagram_apify] fallback actor succeeded")
            return items[0]
    except Exception as e:
        logger.warning("[instagram_apify] fallback actor error: %s", e)
        return None


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

    items = None
    last_error = ""
    with httpx.Client(timeout=300) as client:
        for attempt in range(2):
            resp = client.post(
                f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items",
                json=run_input,
                headers=headers,
                params={"timeout": 240},
            )
            if resp.status_code >= 400:
                last_error = f"Apify run failed ({resp.status_code}): {resp.text[:500]}"
                if "TIMED-OUT" in resp.text and attempt == 0:
                    logger.warning("[instagram_apify] run timed out, retrying once")
                    continue
                raise RuntimeError(last_error)

            items = resp.json()
            if items and not items[0].get("error"):
                break
            # Instagram blocked the scraper (error item) or empty dataset — retry once
            detail = items[0].get("errorDescription") or items[0].get("error") if items else "empty dataset"
            last_error = f"Apify scraper blocked by Instagram: {detail}"
            if attempt == 0:
                logger.warning("[instagram_apify] blocked (%s), retrying once", detail)
                items = None
                continue

    if items and not items[0].get("error"):
        post = items[0]
    else:
        logger.warning("[instagram_apify] primary actor blocked (%s), trying fallback actor", last_error)
        post = _try_fallback_actor(url, headers)
        if post is None:
            logger.error("[instagram_apify] giving up after retry + fallback: %s", last_error or "empty dataset")
            raise RuntimeError(
                "Instagram wouldn't let us download this video. "
                "It may be private, or Instagram is temporarily blocking downloads. Try again later."
            )
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
