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
    with patch("app.api.videos.get_db") as mock:
        db = MagicMock()
        mock.return_value = db
        yield db


def test_submit_video_returns_202_with_job_and_video_ids(mock_db):
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()
    with patch("app.api.videos.get_video_processor") as mock_proc:
        mock_proc.return_value.process_video = MagicMock()
        response = client.post("/api/v1/videos", json={"url": "https://tiktok.com/test"})
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert "video_id" in data


def test_submit_video_rejects_non_tiktok_instagram_url(mock_db):
    response = client.post("/api/v1/videos", json={"url": "https://youtube.com/watch?v=123"})
    assert response.status_code == 422


def test_list_videos_returns_user_videos(mock_db):
    execute_result = MagicMock()
    execute_result.data = [{"id": "vid-1", "url": "https://tiktok.com/1", "category": "Recipes"}]
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = execute_result
    response = client.get("/api/v1/videos")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == "vid-1"


def test_get_video_returns_404_for_missing(mock_db):
    execute_result = MagicMock()
    execute_result.data = []
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = execute_result
    response = client.get("/api/v1/videos/nonexistent-id")
    assert response.status_code == 404


def test_toggle_tried_flips_state(mock_db):
    fetch_result = MagicMock()
    fetch_result.data = [{"tried": False, "tried_count": 0}]
    update_result = MagicMock()
    update_result.data = [{"tried": True, "tried_count": 1}]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = fetch_result
    mock_db.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = update_result
    response = client.patch("/api/v1/videos/vid-1/tried")
    assert response.status_code == 200
    assert response.json()["tried"] is True
    assert response.json()["tried_count"] == 1
