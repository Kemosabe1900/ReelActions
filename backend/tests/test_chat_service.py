from unittest.mock import MagicMock, patch
from app.services.chat import ChatService

USER_ID = "user-1"


def _make_service_for_model_tests():
    with patch("app.services.chat.get_embedding_service"), \
         patch("app.services.chat.Anthropic"):
        return ChatService()


def test_select_model_haiku_for_short():
    svc = _make_service_for_model_tests()
    assert svc._select_model("short") == "claude-haiku-4-5-20251001"


def test_select_model_sonnet_for_long():
    svc = _make_service_for_model_tests()
    assert svc._select_model("x" * 201) == "claude-sonnet-4-6"


def test_select_model_boundary():
    svc = _make_service_for_model_tests()
    assert svc._select_model("x" * 200) == "claude-haiku-4-5-20251001"


def test_stream_response_yields_deltas_and_sources():
    with patch("app.services.chat.get_embedding_service") as mock_em, \
         patch("app.services.chat.Anthropic") as mock_anthropic:

        em = MagicMock()
        mock_em.return_value = em
        em.search_similar.return_value = [
            {"video_url": "https://tiktok.com/1", "video_title": "Pasta", "content": "Boil water"},
        ]

        stream_ctx = MagicMock()
        stream_ctx.__enter__ = MagicMock(return_value=stream_ctx)
        stream_ctx.__exit__ = MagicMock(return_value=False)
        stream_ctx.text_stream = ["Hello", " world"]
        mock_anthropic.return_value.messages.stream.return_value = stream_ctx

        svc = ChatService()
        events = list(svc.stream_response("test", [], USER_ID))

    delta_events = [e for e in events if e["type"] == "delta"]
    sources_events = [e for e in events if e["type"] == "sources"]

    assert [e["text"] for e in delta_events] == ["Hello", " world"]
    assert len(sources_events) == 1
    assert sources_events[0]["urls"] == [{"url": "https://tiktok.com/1", "title": "Pasta"}]


def test_stream_response_deduplicates_sources():
    with patch("app.services.chat.get_embedding_service") as mock_em, \
         patch("app.services.chat.Anthropic") as mock_anthropic:

        em = MagicMock()
        mock_em.return_value = em
        em.search_similar.return_value = [
            {"video_url": "https://tiktok.com/1", "video_title": "Pasta", "content": "Boil water"},
            {"video_url": "https://tiktok.com/1", "video_title": "Pasta", "content": "Add salt"},
        ]

        stream_ctx = MagicMock()
        stream_ctx.__enter__ = MagicMock(return_value=stream_ctx)
        stream_ctx.__exit__ = MagicMock(return_value=False)
        stream_ctx.text_stream = ["hi"]
        mock_anthropic.return_value.messages.stream.return_value = stream_ctx

        svc = ChatService()
        events = list(svc.stream_response("test", [], USER_ID))

    sources = next(e for e in events if e["type"] == "sources")
    assert len(sources["urls"]) == 1


def test_stream_response_yields_error_on_claude_failure():
    with patch("app.services.chat.get_embedding_service") as mock_em, \
         patch("app.services.chat.Anthropic") as mock_anthropic:

        em = MagicMock()
        mock_em.return_value = em
        em.search_similar.return_value = []

        stream_ctx = MagicMock()
        stream_ctx.__enter__ = MagicMock(side_effect=Exception("API down"))
        stream_ctx.__exit__ = MagicMock(return_value=False)
        mock_anthropic.return_value.messages.stream.return_value = stream_ctx

        svc = ChatService()
        events = list(svc.stream_response("test", [], USER_ID))

    assert any(e["type"] == "error" for e in events)
    assert not any(e["type"] == "sources" for e in events)
    error_event = next(e for e in events if e["type"] == "error")
    assert "API down" in error_event["detail"]


def test_stream_response_passes_history_to_claude():
    with patch("app.services.chat.get_embedding_service") as mock_em, \
         patch("app.services.chat.Anthropic") as mock_anthropic:

        em = MagicMock()
        mock_em.return_value = em
        em.search_similar.return_value = []

        stream_ctx = MagicMock()
        stream_ctx.__enter__ = MagicMock(return_value=stream_ctx)
        stream_ctx.__exit__ = MagicMock(return_value=False)
        stream_ctx.text_stream = []
        mock_client = mock_anthropic.return_value
        mock_client.messages.stream.return_value = stream_ctx

        svc = ChatService()
        history = [{"role": "user", "content": "prev question"}]
        list(svc.stream_response("new question", history, USER_ID))

    call_kwargs = mock_client.messages.stream.call_args
    messages = call_kwargs.kwargs["messages"]
    assert messages[0] == {"role": "user", "content": "prev question"}
    assert messages[-1]["role"] == "user"
    assert "Context:" in messages[-1]["content"]
    assert "new question" in messages[-1]["content"]
