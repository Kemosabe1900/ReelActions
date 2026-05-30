import os
import tempfile
import httpx
from app.services.alerting import alert

TIKWM_API = "https://www.tikwm.com/api/"


def download_tiktok_audio(url: str, job_id: str) -> str:
    """Resolve TikTok URL via TikWM, download the video file, return temp path."""
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(TIKWM_API, data={"url": url, "hd": 1})
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        alert(f"TikWM API call failed for job {job_id}: {e}")
        raise RuntimeError(f"TikWM API error: {e}")

    if data.get("code") != 0:
        msg = data.get("msg", "unknown error")
        alert(f"TikWM returned error for job {job_id}: {msg}")
        raise RuntimeError(f"TikWM error: {msg}")

    video_data = data.get("data", {})
    play_url = video_data.get("play")
    if not play_url:
        alert(f"TikWM returned no download URL for job {job_id}")
        raise RuntimeError("TikWM returned no download URL")

    caption = (video_data.get("title") or video_data.get("desc") or "").strip()
    thumbnail_url = (video_data.get("cover") or video_data.get("origin_cover") or "").strip() or None

    tmp_path = os.path.join(tempfile.gettempdir(), f"{job_id}.mp4")
    try:
        with httpx.Client(timeout=120, follow_redirects=True) as client:
            with client.stream("GET", play_url) as r:
                r.raise_for_status()
                with open(tmp_path, "wb") as f:
                    for chunk in r.iter_bytes(chunk_size=8192):
                        f.write(chunk)
    except Exception as e:
        alert(f"TikWM video download failed for job {job_id}: {e}")
        raise RuntimeError(f"TikWM download failed: {e}")

    return tmp_path, caption, thumbnail_url
