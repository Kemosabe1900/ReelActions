from unittest.mock import patch
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
