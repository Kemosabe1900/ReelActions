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
