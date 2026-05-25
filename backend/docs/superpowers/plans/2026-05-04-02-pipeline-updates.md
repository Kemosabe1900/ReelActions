# Pipeline Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the existing pipeline services to match the new product spec: verbose_json transcription with subtitle fallback, dynamic category classification with JSONB schemas, targeted frame extraction, URL caching, and correct database table references.

**Architecture:** Each service is updated independently, test-first. The processor is updated last since it depends on all others. Frame extraction is a new standalone service. No new tables — all changes work with the schema already applied.

**Tech Stack:** OpenAI Whisper (verbose_json), Anthropic Claude Haiku, yt-dlp, ffmpeg, supabase-py, pytest + unittest.mock

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `app/services/embedder.py` | Modify | Fix table name (`chunks`→`transcript_chunks`) + RPC param |
| `app/services/transcriber.py` | Modify | verbose_json + subtitle fallback, new `TranscriptResult` return type |
| `app/services/classifier.py` | Modify | Dynamic categories, JSONB schemas, vision hook, JSON retry |
| `app/services/frame_extractor.py` | Create | Scan segments for vague refs, extract frames via ffmpeg |
| `app/workers/processor.py` | Modify | URL caching, frame extraction, updated table names, structured_data |
| `tests/test_embedder.py` | Create | Unit tests for embedder fixes |
| `tests/test_transcriber.py` | Create | Unit tests for transcriber |
| `tests/test_classifier.py` | Create | Unit tests for classifier |
| `tests/test_frame_extractor.py` | Create | Unit tests for frame extractor |
| `tests/test_processor.py` | Create | Unit tests for processor |

---

### Task 1: Fix embedder — table name and RPC parameter

**Files:**
- Modify: `app/services/embedder.py`
- Create: `tests/test_embedder.py`

Two bugs: embedder writes to `chunks` (table doesn't exist, should be `transcript_chunks`) and calls the search RPC with `query_user_id` (wrong param name, should be `target_user_id` to match our `search_chunks` function). Also, chunk IDs are sha256 hex strings — not valid UUIDs. Replace with `uuid.uuid4()`.

- [ ] **Step 1: Write failing tests**

Create `tests/test_embedder.py`:

```python
import uuid
from unittest.mock import MagicMock, patch
import pytest
from app.services.embedder import EmbeddingService


@pytest.fixture
def mock_openai():
    with patch("app.services.embedder.openai.OpenAI") as mock:
        client = MagicMock()
        mock.return_value = client
        embedding_response = MagicMock()
        embedding_response.data = [MagicMock(embedding=[0.1] * 1536)]
        client.embeddings.create.return_value = embedding_response
        yield client


@pytest.fixture
def mock_supabase():
    with patch("app.services.embedder.get_supabase_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


def test_embed_and_store_uses_transcript_chunks_table(mock_openai, mock_supabase):
    service = EmbeddingService()
    service.embed_and_store("video-id", "This is a test transcript for embedding.", "user-id")
    table_names = [c[0][0] for c in mock_supabase.table.call_args_list]
    assert "transcript_chunks" in table_names
    assert "chunks" not in table_names


def test_embed_and_store_chunk_id_is_valid_uuid(mock_openai, mock_supabase):
    inserted_rows = []

    def capture_insert(data):
        inserted_rows.append(data)
        m = MagicMock()
        m.execute.return_value = MagicMock()
        return m

    mock_supabase.table.return_value.insert.side_effect = capture_insert
    service = EmbeddingService()
    service.embed_and_store("video-id", "Short transcript.", "user-id")
    assert len(inserted_rows) > 0
    for row in inserted_rows:
        uuid.UUID(row["id"])  # raises ValueError if not a valid UUID


def test_search_similar_uses_target_user_id_param(mock_openai, mock_supabase):
    rpc_result = MagicMock()
    rpc_result.data = []
    mock_supabase.rpc.return_value.execute.return_value = rpc_result
    service = EmbeddingService()
    service.search_similar("test query", "user-123")
    rpc_kwargs = mock_supabase.rpc.call_args[0][1]
    assert "target_user_id" in rpc_kwargs
    assert "query_user_id" not in rpc_kwargs
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_embedder.py -v`
Expected: 3 FAILED

- [ ] **Step 3: Fix embedder.py**

At the top of `app/services/embedder.py`, add `import uuid` and remove `import hashlib`.

In `embed_and_store`, replace the chunk insert block:
```python
# Remove this:
chunk_hash = hashlib.sha256(f"{video_id}:{i}:{chunk}".encode()).hexdigest()[:16]
self.supabase.table("chunks").insert({
    "id": chunk_hash,
    "video_id": video_id,
    "user_id": user_id,
    "chunk_index": i,
    "content": chunk,
    "embedding": embedding
}).execute()

# Replace with:
self.supabase.table("transcript_chunks").insert({
    "id": str(uuid.uuid4()),
    "video_id": video_id,
    "user_id": user_id,
    "chunk_index": i,
    "content": chunk,
    "embedding": embedding
}).execute()
```

In `search_similar`, fix the RPC parameter:
```python
# Old:
"query_user_id": user_id,
# New:
"target_user_id": user_id,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_embedder.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/embedder.py tests/test_embedder.py
git commit -m "fix: embedder table name (chunks→transcript_chunks), RPC param, chunk UUID"
```

---

### Task 2: Update transcriber — verbose_json + subtitle fallback

**Files:**
- Modify: `app/services/transcriber.py`
- Create: `tests/test_transcriber.py`

Currently uses `response_format="text"` and returns a plain string. Switch to `verbose_json` which returns `text` + `segments` (each with `start`, `end`, `text` fields) so the frame extractor can find exact timestamps. Add subtitle fallback: if Whisper returns empty text and a `video_url` is provided, pull auto-captions via yt-dlp.

New return type: `TranscriptResult(text: str, segments: list[dict])`.
Rename `transcribe_audio` → `transcribe` and add `video_url: str | None = None` param.

- [ ] **Step 1: Write failing tests**

Create `tests/test_transcriber.py`:

```python
from unittest.mock import MagicMock, patch
import pytest
from app.services.transcriber import TranscriptionService, TranscriptResult, TranscriptionError


@pytest.fixture
def mock_openai():
    with patch("app.services.transcriber.openai.OpenAI") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


def _make_whisper_response(text="Hello world", segments=None):
    response = MagicMock()
    response.text = text
    response.segments = segments or [MagicMock(start=0.0, end=2.5, text="Hello world")]
    return response


def test_transcribe_returns_transcript_result(mock_openai, tmp_path):
    audio = tmp_path / "test.mp3"
    audio.write_bytes(b"fake audio")
    mock_openai.audio.transcriptions.create.return_value = _make_whisper_response()
    service = TranscriptionService()
    result = service.transcribe(str(audio))
    assert isinstance(result, TranscriptResult)
    assert result.text == "Hello world"
    assert len(result.segments) == 1
    assert result.segments[0]["start"] == 0.0
    assert result.segments[0]["text"] == "Hello world"


def test_transcribe_uses_verbose_json(mock_openai, tmp_path):
    audio = tmp_path / "test.mp3"
    audio.write_bytes(b"fake audio")
    mock_openai.audio.transcriptions.create.return_value = _make_whisper_response()
    service = TranscriptionService()
    service.transcribe(str(audio))
    call_kwargs = mock_openai.audio.transcriptions.create.call_args[1]
    assert call_kwargs["response_format"] == "verbose_json"


def test_transcribe_falls_back_to_subtitles_on_empty(mock_openai, tmp_path):
    audio = tmp_path / "test.mp3"
    audio.write_bytes(b"fake audio")
    mock_openai.audio.transcriptions.create.return_value = _make_whisper_response(text="")
    with patch.object(TranscriptionService, "_fetch_subtitles", return_value="Subtitle text here") as mock_sub:
        service = TranscriptionService()
        result = service.transcribe(str(audio), video_url="https://tiktok.com/test")
        mock_sub.assert_called_once_with("https://tiktok.com/test")
        assert result.text == "Subtitle text here"
        assert result.segments == []


def test_transcribe_raises_if_empty_and_no_url(mock_openai, tmp_path):
    audio = tmp_path / "test.mp3"
    audio.write_bytes(b"fake audio")
    mock_openai.audio.transcriptions.create.return_value = _make_whisper_response(text="")
    service = TranscriptionService()
    with pytest.raises(TranscriptionError):
        service.transcribe(str(audio))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_transcriber.py -v`
Expected: 4 FAILED

- [ ] **Step 3: Rewrite transcriber.py**

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_transcriber.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/transcriber.py tests/test_transcriber.py
git commit -m "feat: transcriber verbose_json with timestamps + subtitle fallback"
```

---

### Task 3: Update classifier — dynamic categories + JSONB schemas + vision hook

**Files:**
- Modify: `app/services/classifier.py`
- Create: `tests/test_classifier.py`

Replace hardcoded categories and `ActionStep`-based output with:
- `ClassificationResult(category, title, summary, structured_data, schema_status)`
- `classify(transcript, images, existing_categories)` — accepts `None` transcript for vision-only, list of base64 JPEG strings, and existing user categories for normalization
- JSON retry: if Claude returns invalid JSON, retry once before raising
- `schema_status`: `"mapped"` for Workouts/Recipes/Finance, `"pending_review"` for everything else

- [ ] **Step 1: Write failing tests**

Create `tests/test_classifier.py`:

```python
import json
from unittest.mock import MagicMock, patch
import pytest
from app.services.classifier import ClassificationService, ClassificationResult, ClassificationError


@pytest.fixture
def mock_anthropic():
    with patch("app.services.classifier.Anthropic") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


def _make_response(data: dict):
    response = MagicMock()
    response.content = [MagicMock(text=json.dumps(data))]
    return response


def test_classify_returns_classification_result(mock_anthropic):
    mock_anthropic.messages.create.return_value = _make_response({
        "category": "Recipes",
        "title": "Quick pasta",
        "summary": "A fast pasta recipe.",
        "structured_data": {
            "prep_time_minutes": 5, "cook_time_minutes": 10,
            "servings": 2, "cuisine": "Italian",
            "ingredients": ["pasta", "sauce"], "steps": ["Boil water", "Add pasta"],
        },
        "schema_status": "mapped",
    })
    service = ClassificationService()
    result = service.classify("Today we make pasta. Add sauce. Done.")
    assert isinstance(result, ClassificationResult)
    assert result.category == "Recipes"
    assert result.schema_status == "mapped"
    assert result.structured_data["cuisine"] == "Italian"


def test_classify_generic_schema_for_unknown_category(mock_anthropic):
    mock_anthropic.messages.create.return_value = _make_response({
        "category": "Pottery",
        "title": "Centering clay",
        "summary": "Intro to centering clay on the wheel.",
        "structured_data": {
            "key_concepts": ["centering", "throwing"],
            "action_items": ["buy clay", "practice centering"],
        },
        "schema_status": "pending_review",
    })
    service = ClassificationService()
    result = service.classify("Today we learn to center clay on the wheel.")
    assert result.schema_status == "pending_review"
    assert "key_concepts" in result.structured_data


def test_classify_includes_existing_categories_in_prompt(mock_anthropic):
    mock_anthropic.messages.create.return_value = _make_response({
        "category": "Workouts",
        "title": "Leg day",
        "summary": "Lower body workout.",
        "structured_data": {
            "duration_minutes": 30, "equipment": ["dumbbells"],
            "muscle_groups": ["quads"], "exercises": [],
        },
        "schema_status": "mapped",
    })
    service = ClassificationService()
    service.classify("Squats 3x10.", existing_categories=["Workout", "Recipes"])
    call_args = mock_anthropic.messages.create.call_args
    prompt_text = str(call_args)
    assert "Workout" in prompt_text


def test_classify_retries_on_invalid_json(mock_anthropic):
    bad_response = MagicMock()
    bad_response.content = [MagicMock(text="not json at all")]
    good_response = _make_response({
        "category": "Finance",
        "title": "Investing basics",
        "summary": "How to start investing.",
        "structured_data": {
            "topic": "index funds", "key_concepts": ["diversification"],
            "action_items": ["open brokerage"], "risk_level": "low",
        },
        "schema_status": "mapped",
    })
    mock_anthropic.messages.create.side_effect = [bad_response, good_response]
    service = ClassificationService()
    result = service.classify("Index funds are the best way to invest.")
    assert result.category == "Finance"
    assert mock_anthropic.messages.create.call_count == 2


def test_classify_raises_after_two_json_failures(mock_anthropic):
    bad_response = MagicMock()
    bad_response.content = [MagicMock(text="not json")]
    mock_anthropic.messages.create.return_value = bad_response
    service = ClassificationService()
    with pytest.raises(ClassificationError):
        service.classify("Some transcript")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_classifier.py -v`
Expected: 5 FAILED

- [ ] **Step 3: Rewrite classifier.py**

```python
import json
from typing import Optional
from anthropic import Anthropic
from pydantic import BaseModel
from app.config import settings

SYSTEM_PROMPT = """You are a knowledge extractor for a personal knowledge base app. Users save TikTok and Instagram Reels to build a searchable library of useful knowledge.

Given a video transcript (and optionally images), extract structured knowledge.

## Steps
1. Detect the video's category (e.g. Workouts, Recipes, Finance, Pottery, Productivity, etc.)
2. If existing_categories is provided, normalize to the closest match only if clearly the same topic (e.g. "Workout" -> "Workouts"). Otherwise use a new category name.
3. Fill structured_data using the schema for the detected category.
4. Set schema_status: "mapped" for Workouts, Recipes, or Finance. "pending_review" for any other category.

## Category Schemas

**Workouts:** {"duration_minutes": null_or_int, "equipment": [], "muscle_groups": [], "exercises": [{"name": str, "sets": null_or_int, "reps": null_or_int, "rest_seconds": null_or_int}]}

**Recipes:** {"prep_time_minutes": null_or_int, "cook_time_minutes": null_or_int, "servings": null_or_int, "cuisine": str, "ingredients": [], "steps": []}

**Finance:** {"topic": str, "key_concepts": [], "action_items": [], "risk_level": "low"|"medium"|"high"|null}

**Any other category:** {"key_concepts": [], "action_items": []}

## Output (JSON only, no markdown)
{"category": str, "title": str (max 100 chars), "summary": str (2-3 sentences), "structured_data": {...}, "schema_status": "mapped"|"pending_review"}"""


class ClassificationResult(BaseModel):
    category: str
    title: str
    summary: str
    structured_data: dict
    schema_status: str


class ClassificationError(Exception):
    pass


class ClassificationService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-haiku-4-5-20251001"

    def classify(
        self,
        transcript: str | None,
        images: list[str] | None = None,
        existing_categories: list[str] | None = None,
    ) -> ClassificationResult:
        if not transcript and not images:
            raise ClassificationError("Must provide transcript or images")

        user_content = []

        if images:
            for b64 in images:
                user_content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
                })

        parts = []
        if existing_categories:
            parts.append(f"Existing user categories: {', '.join(existing_categories)}")
        if transcript:
            parts.append(f"Transcript:\n{transcript}")
        else:
            parts.append("No transcript available. Classify from images only.")
        user_content.append({"type": "text", "text": "\n\n".join(parts)})

        last_error: Exception | None = None
        for _ in range(2):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=1024,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_content}],
                )
                data = json.loads(response.content[0].text)
                return ClassificationResult(**data)
            except Exception as e:
                last_error = e

        raise ClassificationError(f"Classification failed after 2 attempts: {str(last_error)}")


_classification_service: Optional[ClassificationService] = None


def get_classification_service() -> ClassificationService:
    global _classification_service
    if _classification_service is None:
        _classification_service = ClassificationService()
    return _classification_service
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_classifier.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/classifier.py tests/test_classifier.py
git commit -m "feat: classifier dynamic categories, JSONB schemas, vision hook, JSON retry"
```

---

### Task 4: Add frame extractor service

**Files:**
- Create: `app/services/frame_extractor.py`
- Create: `tests/test_frame_extractor.py`

Scans transcript segments for vague references ("this", "these", "here", "it", "them", "those", "the following"), then downloads the video temporarily and extracts frames at those timestamps via ffmpeg. Returns base64-encoded JPEGs (max 5). Returns `[]` immediately if no vague references found — no download needed.

- [ ] **Step 1: Write failing tests**

Create `tests/test_frame_extractor.py`:

```python
from unittest.mock import patch, MagicMock
import pytest
from app.services.frame_extractor import find_vague_timestamps, extract_frames_for_vision


def test_find_vague_timestamps_detects_vague_words():
    segments = [
        {"start": 1.0, "end": 2.0, "text": "You need this ingredient."},
        {"start": 3.0, "end": 4.0, "text": "Just mix everything together."},
        {"start": 5.0, "end": 6.0, "text": "Pour these in the bowl."},
    ]
    timestamps = find_vague_timestamps(segments)
    assert 1.0 in timestamps
    assert 5.0 in timestamps
    assert 3.0 not in timestamps


def test_find_vague_timestamps_caps_at_five():
    segments = [{"start": float(i), "end": float(i + 1), "text": "Use this here."} for i in range(10)]
    timestamps = find_vague_timestamps(segments)
    assert len(timestamps) <= 5


def test_find_vague_timestamps_deduplicates_nearby():
    segments = [
        {"start": 1.0, "end": 1.5, "text": "Use this"},
        {"start": 1.3, "end": 1.8, "text": "and these tools"},
    ]
    timestamps = find_vague_timestamps(segments)
    assert len(timestamps) == 1


def test_extract_frames_returns_empty_when_no_vague_refs():
    segments = [{"start": 0.0, "end": 1.0, "text": "Just mix everything together."}]
    result = extract_frames_for_vision("https://tiktok.com/test", segments)
    assert result == []


def test_extract_frames_calls_download_and_ffmpeg_for_vague_refs():
    segments = [{"start": 2.0, "end": 3.0, "text": "Use this tool right here."}]
    with patch("app.services.frame_extractor._download_video_for_frames", return_value="/tmp/video.mp4") as mock_dl, \
         patch("app.services.frame_extractor._extract_frame_at", return_value=b"\xff\xd8\xff") as mock_ff:
        result = extract_frames_for_vision("https://tiktok.com/test", segments)
        mock_dl.assert_called_once()
        mock_ff.assert_called_once()
        assert len(result) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_frame_extractor.py -v`
Expected: 5 FAILED (module not found)

- [ ] **Step 3: Create app/services/frame_extractor.py**

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_frame_extractor.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add app/services/frame_extractor.py tests/test_frame_extractor.py
git commit -m "feat: frame extractor — scan transcript for vague refs, extract via ffmpeg"
```

---

### Task 5: Update processor — URL caching, structured_data, table name fixes

**Files:**
- Modify: `app/workers/processor.py`
- Create: `tests/test_processor.py`

Issues to fix:
1. `jobs` table → `processing_jobs`
2. `_store_actions` / `actions` table → update `structured_data` + `schema_status` on `videos`
3. No URL caching — add cache check before downloading
4. Transcriber now called `transcribe()` (not `transcribe_audio()`) and needs `video_url`
5. Frame extraction added between transcription and classification
6. Pass existing user categories to classifier for normalization

New pipeline:
1. Cache check (same URL by any user → reuse transcript + structured_data, skip to embed)
2. Download audio
3. Transcribe with `video_url` for subtitle fallback
4. Extract frames at vague-reference timestamps
5. Classify with transcript + frames + existing user categories
6. Update video with category, title, summary, structured_data, schema_status
7. Embed
8. Mark completed

- [ ] **Step 1: Write failing tests**

Create `tests/test_processor.py`:

```python
from unittest.mock import MagicMock, patch
import pytest
from app.workers.processor import VideoProcessor
from app.services.transcriber import TranscriptResult
from app.services.classifier import ClassificationResult


@pytest.fixture
def processor():
    with patch("app.workers.processor.get_supabase_client") as mock_sb, \
         patch("app.workers.processor.get_downloader_service") as mock_dl, \
         patch("app.workers.processor.get_transcription_service") as mock_tr, \
         patch("app.workers.processor.get_classification_service") as mock_cl, \
         patch("app.workers.processor.get_embedding_service") as mock_em, \
         patch("app.workers.processor.extract_frames_for_vision", return_value=[]):

        sb = MagicMock()
        mock_sb.return_value = sb

        dl = MagicMock()
        mock_dl.return_value = dl
        dl.download_audio.return_value = "/tmp/test.mp3"

        tr = MagicMock()
        mock_tr.return_value = tr
        tr.transcribe.return_value = TranscriptResult(
            text="Mix this together.",
            segments=[{"start": 0.0, "end": 1.0, "text": "Mix this together."}],
        )

        cl = MagicMock()
        mock_cl.return_value = cl
        cl.classify.return_value = ClassificationResult(
            category="Recipes", title="Quick meal", summary="A fast meal.",
            structured_data={"prep_time_minutes": 5, "cook_time_minutes": 10,
                             "servings": 2, "cuisine": "Italian",
                             "ingredients": ["pasta"], "steps": ["Boil water"]},
            schema_status="mapped",
        )

        em = MagicMock()
        mock_em.return_value = em

        proc = VideoProcessor()
        proc._check_url_cache = MagicMock(return_value=None)
        proc._get_existing_categories = MagicMock(return_value=[])

        yield proc, sb, dl, tr, cl, em


def test_processor_updates_processing_jobs_table(processor):
    proc, sb, dl, tr, cl, em = processor
    proc.process_video("job-1", "video-1", "https://tiktok.com/test", "user-1")
    table_names = [c[0][0] for c in sb.table.call_args_list]
    assert "processing_jobs" in table_names
    assert "jobs" not in table_names


def test_processor_stores_structured_data_on_video(processor):
    proc, sb, dl, tr, cl, em = processor
    proc.process_video("job-1", "video-1", "https://tiktok.com/test", "user-1")
    update_payloads = [c[0][0] for c in sb.table.return_value.update.call_args_list]
    assert any("structured_data" in d for d in update_payloads)
    assert not any("actions" in str(d) for d in update_payloads)


def test_processor_skips_download_on_cache_hit(processor):
    proc, sb, dl, tr, cl, em = processor
    proc._check_url_cache = MagicMock(return_value={
        "transcript": "Old transcript", "structured_data": {"key_concepts": []},
        "category": "Finance", "title": "Old", "summary": "Old summary",
        "schema_status": "mapped",
    })
    proc.process_video("job-1", "video-1", "https://tiktok.com/test", "user-1")
    dl.download_audio.assert_not_called()
    tr.transcribe.assert_not_called()
    cl.classify.assert_not_called()


def test_processor_passes_video_url_to_transcriber(processor):
    proc, sb, dl, tr, cl, em = processor
    proc.process_video("job-1", "video-1", "https://tiktok.com/recipe", "user-1")
    call_kwargs = tr.transcribe.call_args
    assert "https://tiktok.com/recipe" in str(call_kwargs)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_processor.py -v`
Expected: 4 FAILED

- [ ] **Step 3: Rewrite processor.py**

```python
import os
from typing import Optional
from app.database import get_supabase_client
from app.services.downloader import get_downloader_service, DownloadError
from app.services.transcriber import get_transcription_service, TranscriptionError
from app.services.classifier import get_classification_service, ClassificationError
from app.services.embedder import get_embedding_service, EmbeddingError
from app.services.frame_extractor import extract_frames_for_vision


class ProcessingError(Exception):
    pass


class VideoProcessor:
    def __init__(self):
        self._supabase = get_supabase_client()
        self.downloader = get_downloader_service()
        self.transcriber = get_transcription_service()
        self.classifier = get_classification_service()
        self.embedder = get_embedding_service()

    def _update_job(self, job_id: str, status: str, error: str | None = None):
        data = {"status": status}
        if error:
            data["error_message"] = error
        self._supabase.table("processing_jobs").update(data).eq("id", job_id).execute()

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
                self.embedder.embed_and_store(video_id, cached["transcript"], user_id)
                self._update_job(job_id, "completed")
                return

            self._update_job(job_id, "downloading")
            audio_path = self.downloader.download_audio(video_url)

            self._update_job(job_id, "transcribing")
            transcript_result = self.transcriber.transcribe(audio_path, video_url=video_url)
            self._supabase.table("videos").update({
                "transcript": transcript_result.text,
            }).eq("id", video_id).execute()

            frames = extract_frames_for_vision(video_url, transcript_result.segments)

            self._update_job(job_id, "classifying")
            existing_categories = self._get_existing_categories(user_id)
            classification = self.classifier.classify(
                transcript=transcript_result.text,
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
            self.embedder.embed_and_store(video_id, transcript_result.text, user_id)

            self._update_job(job_id, "completed")

        except DownloadError as e:
            self._update_job(job_id, "failed", f"Download failed: {str(e)}")
            raise ProcessingError(str(e))
        except TranscriptionError as e:
            self._update_job(job_id, "failed", f"Transcription failed: {str(e)}")
            raise ProcessingError(str(e))
        except ClassificationError as e:
            self._update_job(job_id, "failed", f"Classification failed: {str(e)}")
            raise ProcessingError(str(e))
        except EmbeddingError as e:
            self._update_job(job_id, "failed", f"Embedding failed: {str(e)}")
            raise ProcessingError(str(e))
        except Exception as e:
            self._update_job(job_id, "failed", f"Unexpected error: {str(e)}")
            raise ProcessingError(str(e))
        finally:
            if audio_path and os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except OSError:
                    pass


_video_processor: Optional[VideoProcessor] = None


def get_video_processor() -> VideoProcessor:
    global _video_processor
    if _video_processor is None:
        _video_processor = VideoProcessor()
    return _video_processor
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_processor.py -v`
Expected: 4 passed

- [ ] **Step 5: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests pass (schema tests + all service tests)

- [ ] **Step 6: Commit**

```bash
git add app/workers/processor.py tests/test_processor.py
git commit -m "feat: processor URL caching, structured_data storage, frame extraction, table fixes"
```
