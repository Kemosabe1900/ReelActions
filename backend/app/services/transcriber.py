import os
import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import openai
from app.config import settings


class TranscriptionError(Exception):
    pass


@dataclass
class TranscriptResult:
    text: str
    segments: list[dict] = field(default_factory=list)


class TranscriptionService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        self.model = "whisper-1"

    def transcribe(self, audio_file_path: str, video_url: str | None = None) -> TranscriptResult:
        audio_path = Path(audio_file_path)
        if not audio_path.exists():
            raise TranscriptionError(f"Audio file not found: {audio_file_path}")

        file_size_mb = audio_path.stat().st_size / (1024 * 1024)
        if file_size_mb > 25:
            raise TranscriptionError(f"Audio file too large: {file_size_mb:.1f}MB (max 25MB)")

        try:
            with open(audio_path, "rb") as f:
                response = self.client.audio.transcriptions.create(
                    model=self.model,
                    file=f,
                    response_format="verbose_json",
                )
        except openai.APIError as e:
            raise TranscriptionError(f"OpenAI API error: {str(e)}")

        text = (response.text or "").strip()
        segments = [
            {"start": s.start, "end": s.end, "text": s.text}
            for s in (response.segments or [])
        ]

        if not text:
            if video_url:
                subtitle_text = self._fetch_subtitles(video_url)
                if subtitle_text:
                    return TranscriptResult(text=subtitle_text, segments=[])
            raise TranscriptionError("Empty transcript and no subtitle fallback available")

        return TranscriptResult(text=text, segments=segments)

    def _fetch_subtitles(self, video_url: str) -> str | None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_template = os.path.join(tmp_dir, "subs")
            cmd = [
                "yt-dlp",
                "--write-auto-subs",
                "--sub-format", "vtt",
                "--skip-download",
                "--output", output_template,
                "--no-warnings",
                video_url,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                return None
            for fname in os.listdir(tmp_dir):
                if fname.endswith(".vtt"):
                    return _parse_vtt(os.path.join(tmp_dir, fname))
        return None


def _parse_vtt(vtt_path: str) -> str:
    lines = Path(vtt_path).read_text(encoding="utf-8").splitlines()
    text_lines = []
    for line in lines:
        if line.startswith("WEBVTT") or "-->" in line or not line.strip():
            continue
        clean = re.sub(r"<[^>]+>", "", line).strip()
        if clean and (not text_lines or clean != text_lines[-1]):
            text_lines.append(clean)
    return " ".join(text_lines)


_transcription_service: Optional[TranscriptionService] = None


def get_transcription_service() -> TranscriptionService:
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = TranscriptionService()
    return _transcription_service
