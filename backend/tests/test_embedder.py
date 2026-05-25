import uuid
from unittest.mock import MagicMock, patch
import pytest
from app.services.embedder import EmbeddingService


@pytest.fixture
def mock_openai():
    with patch("app.services.embedder.openai.OpenAI") as mock:
        client = MagicMock()
        mock.return_value = client
        embedding_response = MagicMock()
        embedding_response.data = [MagicMock(embedding=[0.1] * 1536)]
        client.embeddings.create.return_value = embedding_response
        yield client


@pytest.fixture
def mock_supabase():
    with patch("app.services.embedder.get_db") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


def test_embed_and_store_uses_transcript_chunks_table(mock_openai, mock_supabase):
    service = EmbeddingService()
    service.embed_and_store("video-id", "This is a test transcript for embedding.", "user-id")
    table_names = [c[0][0] for c in mock_supabase.table.call_args_list]
    assert "transcript_chunks" in table_names
    assert "chunks" not in table_names


def test_embed_and_store_chunk_id_is_valid_uuid(mock_openai, mock_supabase):
    inserted_rows = []

    def capture_insert(data):
        inserted_rows.append(data)
        m = MagicMock()
        m.execute.return_value = MagicMock()
        return m

    mock_supabase.table.return_value.insert.side_effect = capture_insert
    service = EmbeddingService()
    service.embed_and_store("video-id", "Short transcript.", "user-id")
    assert len(inserted_rows) > 0
    for row in inserted_rows:
        uuid.UUID(row["id"])  # raises ValueError if not a valid UUID


def test_search_similar_uses_target_user_id_param(mock_openai, mock_supabase):
    rpc_result = MagicMock()
    rpc_result.data = []
    mock_supabase.rpc.return_value.execute.return_value = rpc_result
    service = EmbeddingService()
    service.search_similar("test query", "user-123")
    rpc_kwargs = mock_supabase.rpc.call_args[0][1]
    assert "target_user_id" in rpc_kwargs
    assert "query_user_id" not in rpc_kwargs
