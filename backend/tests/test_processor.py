from unittest.mock import MagicMock, patch
import pytest
from app.workers.processor import VideoProcessor
from app.services.transcriber import TranscriptResult
from app.services.classifier import ClassificationResult


@pytest.fixture
def processor():
    with patch("app.workers.processor.get_db") as mock_sb, \
         patch("app.workers.processor.download_audio", return_value=("/tmp/test.mp3", "Mix this together to make a quick meal.", None, None)) as mock_dl, \
         patch("app.workers.processor.get_transcription_service") as mock_tr, \
         patch("app.workers.processor.get_classification_service") as mock_cl, \
         patch("app.workers.processor.get_embedding_service") as mock_em, \
         patch("app.workers.processor.extract_frames_for_vision", return_value=[]), \
         patch("app.workers.processor.notify_user"):

        sb = MagicMock()
        mock_sb.return_value = sb

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

        yield proc, sb, mock_dl, tr, cl, em


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
    dl.assert_not_called()
    tr.transcribe.assert_not_called()
    cl.classify.assert_not_called()


def test_processor_passes_video_url_to_transcriber(processor):
    proc, sb, dl, tr, cl, em = processor
    proc.process_video("job-1", "video-1", "https://tiktok.com/recipe", "user-1")
    call_kwargs = tr.transcribe.call_args
    assert "https://tiktok.com/recipe" in str(call_kwargs)
