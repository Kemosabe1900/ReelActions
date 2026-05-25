"""
Text embedding and vector storage service using OpenAI embeddings + pgvector.
"""
import uuid
from typing import Optional
import openai
from app.config import settings
from app.database import get_db


class EmbeddingError(Exception):
    """Raised when embedding or storage fails."""
    pass


class EmbeddingService:
    """Handles text chunking, embedding, and vector storage."""

    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=settings.openai_api_key)
        self.supabase = get_db()
        self.embedding_model = "text-embedding-3-small"
        self.chunk_size = 500  # characters per chunk
        self.chunk_overlap = 50  # overlap between chunks

    def _chunk_text(self, text: str) -> list[str]:
        """
        Split text into overlapping chunks for embedding.

        Args:
            text: Full text to chunk

        Returns:
            List of text chunks
        """
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + self.chunk_size
            chunk = text[start:end]

            # Try to break at sentence boundary
            if end < len(text):
                # Look for last period, question mark, or exclamation
                last_sentence = max(
                    chunk.rfind('. '),
                    chunk.rfind('? '),
                    chunk.rfind('! ')
                )
                if last_sentence > self.chunk_size // 2:
                    chunk = chunk[:last_sentence + 1]
                    end = start + last_sentence + 1

            chunks.append(chunk.strip())
            start = end - self.chunk_overlap

        return chunks

    def _generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding vector for text using OpenAI API.

        Args:
            text: Text to embed

        Returns:
            Embedding vector (1536 dimensions for text-embedding-3-small)

        Raises:
            EmbeddingError: If embedding generation fails
        """
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            raise EmbeddingError(f"Failed to generate embedding: {str(e)}")

    def embed_and_store(
        self,
        video_id: str,
        transcript: str,
        user_id: str,
        title: str | None = None,
        category: str | None = None,
    ) -> int:
        if not transcript or len(transcript.strip()) < 10:
            raise EmbeddingError("Transcript too short to embed")

        metadata_prefix = ""
        if category or title:
            metadata_prefix = f"[{category or 'Video'}] {title or ''}\n\n"

        try:
            chunks = self._chunk_text(transcript)
            stored_count = 0

            for i, chunk in enumerate(chunks):
                enriched = f"{metadata_prefix}{chunk}" if metadata_prefix else chunk
                embedding = self._generate_embedding(enriched)
                chunk_id = str(uuid.uuid4())

                self.supabase.table("transcript_chunks").insert({
                    "id": chunk_id,
                    "video_id": video_id,
                    "user_id": user_id,
                    "chunk_index": i,
                    "content": chunk,
                    "embedding": embedding
                }).execute()

                stored_count += 1

            return stored_count

        except Exception as e:
            raise EmbeddingError(f"Failed to embed and store transcript: {str(e)}")

    def search_similar(self, query: str, user_id: str, limit: int = 5) -> list[dict]:
        """
        Search for similar chunks using vector similarity.

        Args:
            query: Search query text
            user_id: UUID of the user (to filter their chunks only)
            limit: Maximum number of results (default 5)

        Returns:
            List of matching chunks with video metadata

        Raises:
            EmbeddingError: If search fails
        """
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)

            # Use Supabase RPC function for vector similarity search
            # This assumes a stored procedure exists: search_chunks(query_embedding, target_user_id, match_count)
            response = self.supabase.rpc(
                "search_chunks",
                {
                    "query_embedding": query_embedding,
                    "target_user_id": user_id,
                    "match_count": limit
                }
            ).execute()

            return [c for c in response.data if c.get("similarity", 0) >= 0.1]

        except Exception as e:
            raise EmbeddingError(f"Failed to search chunks: {str(e)}")

# Singleton instance
_embedding_service: Optional[EmbeddingService] = None

def get_embedding_service() -> EmbeddingService:
    """Get or create singleton EmbeddingService instance."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
