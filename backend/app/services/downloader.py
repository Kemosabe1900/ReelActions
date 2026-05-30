import base64
import glob
import json
import logging
import os
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp'}


def is_image_post(url: str) -> bool:
    # Fast path: known video platforms/patterns — no network call needed
    if "tiktok.com" in url:
        return "/photo/" in url
    if "instagram.com/reel/" in url:
        return False
    if "youtube.com" in url or "youtu.be" in url:
        return False
    # Ambiguous (e.g. instagram.com/p/) — check metadata
    if "instagram.com" not in url:
        return False
    cmd = ["yt-dlp", "--dump-json", "--no-playlist", "--no-download", url]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        return False
    try:
        info = json.loads(result.stdout.split('\n')[0])
        ext = info.get('ext', '')
        if ext in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
            return True
        formats = info.get('formats', [])
        has_audio = any(f.get('acodec') not in (None, 'none') for f in formats)
        return not has_audio and bool(formats)
    except Exception:
        return False


def download_images(url: str, job_id: str) -> list[str]:
    """Download images from URL, return list of base64-encoded JPEG strings (max 5)."""
    tmp = tempfile.mkdtemp()
    cmd = [
        "yt-dlp",
        "--output", os.path.join(tmp, f"{job_id}_%(playlist_index)s.%(ext)s"),
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp image download failed: {result.stderr.strip()[:500]}")

    matches = sorted(
        f for f in glob.glob(os.path.join(tmp, f"{job_id}_*"))
        if Path(f).suffix.lower() in IMAGE_EXTS
    )
    if not matches:
        raise RuntimeError("No image files found after download")

    b64_images = []
    for path in matches[:5]:
        b64_images.append(base64.b64encode(Path(path).read_bytes()).decode())
        os.remove(path)

    try:
        os.rmdir(tmp)
    except OSError:
        pass

    return b64_images


def _fetch_ytdlp_meta(url: str) -> tuple[str, str | None]:
    """Quick metadata fetch — returns (caption, thumbnail_url)."""
    cmd = ["yt-dlp", "--dump-json", "--no-download", "--no-playlist", url]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and result.stdout.strip():
            info = json.loads(result.stdout.strip().split('\n')[0])
            caption = (info.get("description") or info.get("title") or "").strip()
            thumbnail = info.get("thumbnail") or None
            return caption, thumbnail
    except Exception:
        pass
    return "", None


def _download_via_ytdlp(url: str, job_id: str) -> tuple[str, str, str | None]:
    caption, thumbnail_url = _fetch_ytdlp_meta(url)
    tmp = tempfile.gettempdir()
    cmd = [
        "yt-dlp",
        # vcodec=none = audio-only stream (no merge needed)
        # best[ext=mp4] = pre-combined single file fallback (still no merge)
        "--format", "bestaudio[vcodec=none][ext=m4a]/bestaudio[vcodec=none]/best[ext=mp4]/best",
        "--no-playlist",
        "--no-check-formats",
        "--no-part",
        "--max-filesize", "50m",
        "--output", os.path.join(tmp, f"{job_id}.%(ext)s"),
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr.strip()[:500]}")
    matches = glob.glob(os.path.join(tmp, f"{job_id}.*"))
    if not matches:
        raise RuntimeError(
            f"Audio file not found after download. "
            f"stdout={result.stdout.strip()[:200]} stderr={result.stderr.strip()[:200]}"
        )
    raw_path = matches[0]
    raw_size = os.path.getsize(raw_path)
    logger.info("[downloader] downloaded %s (%d bytes)", raw_path, raw_size)

    mp3_path = os.path.join(tmp, f"{job_id}_audio.mp3")
    conv = subprocess.run(
        ["ffmpeg", "-y", "-i", raw_path, "-vn", "-acodec", "libmp3lame", "-q:a", "5", mp3_path],
        capture_output=True, text=True, timeout=120,
    )
    if conv.returncode == 0:
        logger.info("[downloader] ffmpeg conversion succeeded -> %s", mp3_path)
        try:
            os.remove(raw_path)
        except OSError:
            pass
        return mp3_path, caption, thumbnail_url

    logger.error("[downloader] ffmpeg conversion failed (rc=%d): %s", conv.returncode, conv.stderr.strip()[:500])
    raise RuntimeError(f"ffmpeg conversion failed: {conv.stderr.strip()[:300]}")


def download_audio(url: str, job_id: str) -> tuple[str, str, str | None]:
    """Download audio from URL. Returns (audio_path, caption, thumbnail_url). Routes TikTok through TikWM."""
    if "tiktok.com" in url:
        from app.services.tiktok_scraper import download_tiktok_audio
        return download_tiktok_audio(url, job_id)
    return _download_via_ytdlp(url, job_id)


def detect_platform(url: str) -> str:
    if "tiktok.com" in url:
        return "tiktok"
    if "instagram.com" in url:
        return "instagram"
    if "youtube.com" in url or "youtu.be" in url:
        return "youtube"
    return "other"


def cleanup(path: str) -> None:
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
