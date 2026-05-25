from typing import Generator, Optional
from anthropic import Anthropic
from app.config import settings
from app.services.embedder import get_embedding_service

SYSTEM_PROMPT = (
    "You are a personal knowledge assistant. The user has saved TikTok and Instagram Reels "
    "to build a knowledge base. Every saved item is a video — never distinguish between 'video' and 'guide' or 'text'. "
    "When the user asks for 'workout videos', 'recipe videos', etc., they mean saved content on that topic. "
    "Reply in one sentence only. Never describe, summarize, or list what the content contains. "
    "Only answer from the user's saved content — never use general knowledge. "
    "When relevant saves exist: confirm briefly using the user's own words for the topic, vary your phrasing naturally "
    "(e.g. 'Here's what I found on workouts.', 'Found a few saves on meal prep.', 'Got something on that.'). "
    "When nothing relevant exists or the question is unrelated to saved content: decline naturally "
    "(e.g. 'Nothing saved on that yet.', 'You haven\\'t saved anything on that topic.', 'No saves on that one.'). "
    "The cards below your reply show all details — never repeat them."
)


class ChatService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.embedder = get_embedding_service()

    def _select_model(self, message: str) -> str:
        return "claude-haiku-4-5-20251001" if len(message) <= 200 else "claude-sonnet-4-6"

    def stream_response(
        self,
        message: str,
        history: list[dict],
        user_id: str,
    ) -> Generator[dict, None, None]:
        chunks = self.embedder.search_similar(message, user_id, limit=5)

        context_parts = [f"[{c['video_title']}]\n{c['content']}" for c in chunks]
        context = "\n\n".join(context_parts) if context_parts else "No relevant videos found."

        seen_urls: set[str] = set()
        sources = []
        for c in chunks:
            if c.get("similarity", 0) >= 0.25 and c["video_url"] not in seen_urls:
                seen_urls.add(c["video_url"])
                sources.append({"id": str(c["video_id"]), "url": c["video_url"], "title": c["video_title"]})

        messages = [
            *[{"role": m["role"], "content": m["content"]} for m in history],
            {"role": "user", "content": f"Context:\n\n{context}\n\nQuestion: {message}"},
        ]

        model = self._select_model(message)

        try:
            with self.client.messages.stream(
                model=model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield {"type": "delta", "text": text}
        except Exception as e:
            yield {"type": "error", "detail": str(e)}
            return

        yield {"type": "sources", "urls": sources}


_chat_service: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service
