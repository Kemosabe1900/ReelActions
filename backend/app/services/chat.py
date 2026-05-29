from datetime import datetime, timezone, timedelta
from typing import Generator, Optional
from anthropic import Anthropic
from app.config import settings
from app.database import get_db
from app.services.embedder import get_embedding_service

BASE_SYSTEM_PROMPT = (
    "You are a personal knowledge assistant for ReelActions. The user saves TikTok and Instagram Reels "
    "to build a personal knowledge base. Every saved item is a video.\n"
    "Reply in 1-2 sentences max. Never describe video content in detail — the cards below your reply show that.\n"
    "Only answer from the user's saved content and library metadata provided. Never use general knowledge.\n"
    "When relevant saves exist: confirm briefly and naturally "
    "(e.g. 'Here\\'s what I found.', 'Found a few saves on that.', 'Got something on that.').\n"
    "When nothing exists: decline naturally "
    "(e.g. 'Nothing saved on that yet.', 'No saves on that topic.', 'You haven\\'t saved anything on that.').\n"
    "For questions about when videos were saved, how many, or what categories — use the Library Summary provided."
)


class ChatService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.embedder = get_embedding_service()

    def _select_model(self, message: str) -> str:
        temporal = ["today", "this week", "last week", "recently", "when", "how many", "all my", "latest", "oldest"]
        if any(kw in message.lower() for kw in temporal):
            return "claude-sonnet-4-6"
        return "claude-haiku-4-5-20251001"

    def _build_library_snapshot(self, user_id: str) -> str:
        try:
            db = get_db()
            result = (
                db.table("videos")
                .select("id,title,category,created_at,tried")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            videos = result.data
            if not videos:
                return "No saved videos yet."

            now = datetime.now(timezone.utc)
            today = now.date()
            week_ago = now - timedelta(days=7)

            lines = [f"Total saved: {len(videos)} video(s)"]

            categories = sorted({v["category"] for v in videos if v.get("category")})
            if categories:
                lines.append(f"Categories: {', '.join(categories)}")

            recent = []
            for v in videos:
                raw = v["created_at"].replace("Z", "+00:00")
                created = datetime.fromisoformat(raw)
                if created >= week_ago:
                    days_ago = (today - created.date()).days
                    label = "today" if days_ago == 0 else ("yesterday" if days_ago == 1 else f"{days_ago} days ago")
                    title = v.get("title") or "Untitled"
                    cat = v.get("category") or "uncategorized"
                    recent.append(f"  - {title} (saved {label}, category: {cat})")

            if recent:
                lines.append(f"Saved this week ({len(recent)}):\n" + "\n".join(recent))
            else:
                lines.append("No videos saved this week.")

            return "\n".join(lines)
        except Exception:
            return ""

    def stream_response(
        self,
        message: str,
        history: list[dict],
        user_id: str,
    ) -> Generator[dict, None, None]:
        chunks = self.embedder.search_similar(message, user_id, limit=5)

        context_parts = [f"[{c['video_title']}]\n{c['content']}" for c in chunks]
        rag_context = "\n\n".join(context_parts) if context_parts else "No semantically relevant videos found."

        snapshot = self._build_library_snapshot(user_id)

        today_str = datetime.now(timezone.utc).strftime("%A, %B %d, %Y")
        system = BASE_SYSTEM_PROMPT + f"\n\nToday is {today_str}."

        full_context = f"Library Summary:\n{snapshot}\n\nRelevant content (semantic search):\n{rag_context}"

        seen_urls: set[str] = set()
        sources = []
        for c in chunks:
            if c.get("similarity", 0) >= 0.25 and c["video_url"] not in seen_urls:
                seen_urls.add(c["video_url"])
                sources.append({"id": str(c["video_id"]), "url": c["video_url"], "title": c["video_title"]})

        messages = [
            *[{"role": m["role"], "content": m["content"]} for m in history],
            {"role": "user", "content": f"Context:\n\n{full_context}\n\nQuestion: {message}"},
        ]

        model = self._select_model(message)

        try:
            with self.client.messages.stream(
                model=model,
                max_tokens=1024,
                system=system,
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
