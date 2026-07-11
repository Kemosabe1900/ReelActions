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
    with patch("app.api.push_tokens.get_db") as mock:
        db = MagicMock()
        mock.return_value = db
        yield db


def test_register_deletes_same_token_for_other_users(mock_db):
    response = client.post("/api/v1/push-tokens", json={"token": "ExponentPushToken[abc]"})
    assert response.status_code == 204

    delete_chain = mock_db.table.return_value.delete.return_value
    delete_chain.eq.assert_called_with("token", "ExponentPushToken[abc]")
    delete_chain.eq.return_value.neq.assert_called_with("user_id", TEST_USER_ID)

    mock_db.table.return_value.upsert.assert_called_once_with(
        {"user_id": TEST_USER_ID, "token": "ExponentPushToken[abc]"},
        on_conflict="user_id,token",
    )


def test_unregister_deletes_own_token(mock_db):
    response = client.request(
        "DELETE", "/api/v1/push-tokens", json={"token": "ExponentPushToken[abc]"}
    )
    assert response.status_code == 204

    delete_chain = mock_db.table.return_value.delete.return_value
    delete_chain.eq.assert_called_with("token", "ExponentPushToken[abc]")
    delete_chain.eq.return_value.eq.assert_called_with("user_id", TEST_USER_ID)
