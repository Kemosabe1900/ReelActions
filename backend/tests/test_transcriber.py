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
