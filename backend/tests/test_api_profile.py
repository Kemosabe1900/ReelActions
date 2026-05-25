from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user

TEST_USER_ID = "test-user-123"
app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
client = TestClient(app)


@pytest.fixture
def mock_db():
    with patch("app.api.profile.get_db") as mock:
        db = MagicMock()
        mock.return_value = db
        yield db


def test_get_profile_returns_profile_with_explorer_stats(mock_db):
    profile_result = MagicMock()
    profile_result.data = [{
        "id": TEST_USER_ID,
        "subscription_status": "trial",
        "current_streak": 3,
        "longest_streak": 5,
        "explorer_score": 0,
    }]
    videos_result = MagicMock()
    videos_result.data = [
        {"tried": True},
        {"tried": True},
        {"tried": False},
    ]
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = profile_result
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = videos_result

    response = client.get("/api/v1/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["current_streak"] == 3
    assert data["explorer_tried"] == 2
    assert data["explorer_total"] == 3


def test_get_profile_returns_404_when_no_profile(mock_db):
    profile_result = MagicMock()
    profile_result.data = []
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = profile_result
    response = client.get("/api/v1/profile")
    assert response.status_code == 404
