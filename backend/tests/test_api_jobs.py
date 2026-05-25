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
