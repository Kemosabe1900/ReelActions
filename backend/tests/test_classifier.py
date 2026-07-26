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


HEDGED = {
    "category": "Workouts",
    "title": "Body training methods",
    "summary": "The transcript appears to be focused on exercise techniques, though the audio quality makes specific details difficult to extract with certainty.",
    "structured_data": {"duration_minutes": None, "equipment": [], "muscle_groups": [], "exercises": []},
    "schema_status": "mapped",
}

CLEAN = {
    "category": "Workouts",
    "title": "Explosive bodyweight conditioning",
    "summary": "Push-up and squat variations trained to failure for conditioning.",
    "structured_data": {"duration_minutes": None, "equipment": [], "muscle_groups": ["chest", "legs"], "exercises": []},
    "schema_status": "mapped",
}


def test_meta_language_triggers_corrective_retry(mock_anthropic):
    mock_anthropic.messages.create.side_effect = [_make_response(HEDGED), _make_response(CLEAN)]
    service = ClassificationService()
    result = service.classify("Some muffled workout speech.")
    assert result.summary == CLEAN["summary"]
    assert mock_anthropic.messages.create.call_count == 2
    retry_messages = mock_anthropic.messages.create.call_args.kwargs["messages"]
    assert len(retry_messages) == 3
    assert "described the input" in retry_messages[2]["content"]


def test_meta_language_survives_retry_alerts_and_keeps_retry(mock_anthropic):
    with patch("app.services.alerting.alert") as mock_alert:
        mock_anthropic.messages.create.side_effect = [_make_response(HEDGED), _make_response(HEDGED)]
        service = ClassificationService()
        result = service.classify("Some muffled workout speech.")
        assert result.summary == HEDGED["summary"]
        mock_alert.assert_called_once()


def test_clean_summary_does_not_retry(mock_anthropic):
    mock_anthropic.messages.create.return_value = _make_response(CLEAN)
    service = ClassificationService()
    result = service.classify("Clear workout speech.")
    assert mock_anthropic.messages.create.call_count == 1
    assert result.summary == CLEAN["summary"]
