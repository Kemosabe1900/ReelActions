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
    with patch("app.api.chat.get_db") as mock:
        db = MagicMock()
        mock.return_value = db
        yield db


@pytest.fixture
def mock_chat_service():
    with patch("app.api.chat.get_chat_service") as mock:
        svc = MagicMock()
        mock.return_value = svc
        yield svc


def test_chat_returns_200_with_event_stream(mock_db, mock_chat_service):
    mock_chat_service.stream_response.return_value = iter([
        {"type": "delta", "text": "Hello"},
        {"type": "sources", "urls": [{"url": "https://tiktok.com/1", "title": "Test"}]},
    ])
    response = client.post("/api/v1/chat", json={"message": "test", "history": []})
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]


def test_chat_stream_contains_delta_and_sources_and_done(mock_db, mock_chat_service):
    mock_chat_service.stream_response.return_value = iter([
        {"type": "delta", "text": "Hello"},
        {"type": "sources", "urls": [{"url": "https://tiktok.com/1", "title": "Test"}]},
    ])
    response = client.post("/api/v1/chat", json={"message": "test", "history": []})
    content = response.text
    assert '"type": "delta"' in content
    assert '"type": "sources"' in content
    assert "data: [DONE]" in content


def test_chat_writes_both_turns_to_db(mock_db, mock_chat_service):
    mock_chat_service.stream_response.return_value = iter([
        {"type": "delta", "text": "Reply text"},
        {"type": "sources", "urls": [{"url": "https://tiktok.com/1", "title": "Test"}]},
    ])
    client.post("/api/v1/chat", json={"message": "my question", "history": []})
    insert_payloads = [c[0][0] for c in mock_db.table.return_value.insert.call_args_list]
    user_msg = next(p for p in insert_payloads if p["role"] == "user")
    asst_msg = next(p for p in insert_payloads if p["role"] == "assistant")
    assert user_msg["content"] == "my question"
    assert asst_msg["content"] == "Reply text"
    assert asst_msg["video_sources"] == [{"url": "https://tiktok.com/1", "title": "Test"}]


def test_chat_trims_history_to_last_6(mock_db, mock_chat_service):
    mock_chat_service.stream_response.return_value = iter([])
    history = [{"role": "user", "content": f"msg {i}"} for i in range(10)]
    client.post("/api/v1/chat", json={"message": "new", "history": history})
    call_args = mock_chat_service.stream_response.call_args
    passed_history = call_args[0][1]
    assert len(passed_history) == 6
    assert passed_history[-1]["content"] == "msg 9"
