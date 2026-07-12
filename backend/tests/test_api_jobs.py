from datetime import datetime, timezone, timedelta
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
    with patch("app.api.jobs.get_db") as mock:
        db = MagicMock()
        mock.return_value = db
        yield db


def test_get_job_returns_job_data(mock_db):
    result = MagicMock()
    result.data = [{"id": "job-1", "status": "completed", "user_id": TEST_USER_ID}]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = result
    response = client.get("/api/v1/jobs/job-1")
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_get_job_returns_404_when_not_found(mock_db):
    result = MagicMock()
    result.data = []
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = result
    response = client.get("/api/v1/jobs/nonexistent")
    assert response.status_code == 404


def _job_row(status: str, updated_seconds_ago: int, created_seconds_ago: int = 900) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "id": "job-1",
        "status": status,
        "user_id": TEST_USER_ID,
        "created_at": (now - timedelta(seconds=created_seconds_ago)).isoformat(),
        "updated_at": (now - timedelta(seconds=updated_seconds_ago)).isoformat(),
    }


def test_silent_job_marked_failed_after_staleness_window(mock_db):
    result = MagicMock()
    result.data = [_job_row("downloading", updated_seconds_ago=700)]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = result
    response = client.get("/api/v1/jobs/job-1")
    assert response.json()["status"] == "failed"


def test_old_but_heartbeating_job_stays_alive(mock_db):
    result = MagicMock()
    result.data = [_job_row("transcribing", updated_seconds_ago=30, created_seconds_ago=900)]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = result
    response = client.get("/api/v1/jobs/job-1")
    assert response.json()["status"] == "transcribing"


def test_staleness_falls_back_to_created_at(mock_db):
    row = _job_row("pending", updated_seconds_ago=0, created_seconds_ago=700)
    row["updated_at"] = None
    result = MagicMock()
    result.data = [row]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value = result
    response = client.get("/api/v1/jobs/job-1")
    assert response.json()["status"] == "failed"
