import base64
import os
import re
import subprocess
import tempfile
from pathlib import Path

VAGUE_PATTERN = re.compile(
    r'\b(this|these|here|it|them|those|the following)\b',
    re.IGNORECASE,
)
MAX_FRAMES = 5


def find_vague_timestamps(segments: list[dict]) -> list[float]:
    """Return timestamps (up to MAX_FRAMES) where vague references appear, deduplicated by 1s bucket."""
    seen_buckets: set[int] = set()
    timestamps: list[float] = []
    for seg in segments:
        if VAGUE_PATTERN.search(seg.get("text", "")):
            bucket = int(seg["start"])
            if bucket not in seen_buckets:
                seen_buckets.add(bucket)
                timestamps.append(seg["start"])
                if len(timestamps) >= MAX_FRAMES:
                    break
    return timestamps


def extract_frames_for_vision(video_url: str, segments: list[dict]) -> list[str]:
    """
    Extract frames at vague-reference timestamps.
    Returns list of base64-encoded JPEG strings (max 5), or [] if no vague refs found.
    Downloads video temporarily — file is deleted when the context manager exits.
    """
    timestamps = find_vague_timestamps(segments)
    if not timestamps:
        return []

    with tempfile.TemporaryDirectory() as tmp_dir:
        video_path = _download_video_for_frames(video_url, tmp_dir)
        if not video_path:
            return []

        frames = []
        for t in timestamps:
            frame_bytes = _extract_frame_at(video_path, t, tmp_dir)
            if frame_bytes:
                frames.append(base64.b64encode(frame_bytes).decode())
        return frames


def _download_video_for_frames(video_url: str, tmp_dir: str) -> str | None:
    output_path = os.path.join(tmp_dir, "video.mp4")
    cmd = [
        "yt-dlp",
        "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--no-playlist",
        "--max-filesize", "200m",
        "--no-warnings",
        "--output", output_path,
        video_url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0 or not os.path.exists(output_path):
        return None
    return output_path


def _extract_frame_at(video_path: str, timestamp: float, tmp_dir: str) -> bytes | None:
    frame_path = os.path.join(tmp_dir, f"frame_{int(timestamp * 1000)}.jpg")
    cmd = [
        "ffmpeg",
        "-ss", str(timestamp),
        "-i", video_path,
        "-frames:v", "1",
        "-q:v", "2",
        "-y",
        frame_path,
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=30)
    if result.returncode != 0 or not os.path.exists(frame_path):
        return None
    return Path(frame_path).read_bytes()
