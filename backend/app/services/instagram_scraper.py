import glob
import logging
import os
import shutil
import tempfile

logger = logging.getLogger(__name__)


def download_instagram_audio(url: str, job_id: str) -> tuple[str, str, str | None]:
    """Download Instagram video via instaloader (fallback when yt-dlp fails)."""
    try:
        import instaloader
    except ImportError:
        raise RuntimeError("instaloader not installed")

    from app.config import settings

    L = instaloader.Instaloader(
        download_pictures=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        post_metadata_txt_pattern="",
        quiet=True,
    )

    ig_user = getattr(settings, "instagram_username", "")
    ig_pass = getattr(settings, "instagram_password", "")
    if ig_user and ig_pass:
        try:
            L.login(ig_user, ig_pass)
            logger.info("[instagram_scraper] logged in as %s", ig_user)
        except Exception as e:
            logger.warning("[instagram_scraper] login failed: %s", e)

    shortcode = None
    for pattern in ["/reel/", "/p/", "/tv/"]:
        if pattern in url:
            shortcode = url.split(pattern)[-1].split("/")[0].split("?")[0]
            break

    if not shortcode:
        raise RuntimeError(f"Could not extract shortcode from URL: {url}")

    tmp = tempfile.mkdtemp()
    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        caption = post.caption or ""

        if not post.is_video:
            raise RuntimeError("Instagram post has no video")

        L.download_post(post, target=tmp)

        matches = glob.glob(os.path.join(tmp, "**/*.mp4"), recursive=True)
        if not matches:
            matches = glob.glob(os.path.join(tmp, "*.mp4"))
        if not matches:
            raise RuntimeError("No .mp4 found after instaloader download")

        raw_path = os.path.join(tempfile.gettempdir(), f"{job_id}_ig.mp4")
        os.rename(matches[0], raw_path)

        logger.info("[instagram_scraper] instaloader succeeded: %s", raw_path)
        return raw_path, caption, None

    except instaloader.exceptions.InstaloaderException as e:
        raise RuntimeError(f"instaloader failed: {e}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
