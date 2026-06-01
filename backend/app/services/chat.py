import json
import logging
import re
import threading

logger = logging.getLogger(__name__)
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
    "Never use em dashes (—) in responses. Use a comma or period instead.\n"
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

    def _build_library_snapshot(self, user_id: str) -> tuple[str, list[dict]]:
        try:
            db = get_db()
            result = (
                db.table("videos")
                .select("id,title,category,url,created_at,tried,thumbnail_url")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            videos = result.data
            if not videos:
                return "No saved videos yet.", []

            now = datetime.now(timezone.utc)
            today = now.date()
            week_ago = now - timedelta(days=7)

            lines = [f"Total saved: {len(videos)} video(s)"]

            categories = sorted({v["category"] for v in videos if v.get("category")})
            if categories:
                lines.append(f"Categories: {', '.join(categories)}")

            recent_lines = []
            recent_videos = []
            for v in videos:
                raw = v["created_at"].replace("Z", "+00:00")
                created = datetime.fromisoformat(raw)
                if created >= week_ago:
                    days_ago = (today - created.date()).days
                    label = "today" if days_ago == 0 else ("yesterday" if days_ago == 1 else f"{days_ago} days ago")
                    title = v.get("title") or "Untitled"
                    cat = v.get("category") or "uncategorized"
                    recent_lines.append(f"  - {title} (saved {label}, category: {cat})")
                    recent_videos.append(v)

            if recent_lines:
                lines.append(f"Saved this week ({len(recent_lines)}):\n" + "\n".join(recent_lines))
            else:
                lines.append("No videos saved this week.")

            return "\n".join(lines), recent_videos
        except Exception:
            return "", []

    def _identify_relevant_chunks(self, message: str, chunks: list[dict]) -> list[dict]:
        """Ask Haiku which chunks actually answer the query. Fallback to threshold on failure."""
        if not chunks:
            return []
        chunk_list = "\n".join(
            f'ID:{c["video_id"]} | {c["video_title"]} — {c["content"][:80]}'
            for c in chunks
        )
        try:
            resp = self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=150,
                messages=[{"role": "user", "content": (
                    f'Query: "{message}"\n\nVideos:\n{chunk_list}\n\n'
                    "Which video IDs directly answer this query? "
                    "Return ONLY a JSON array of ID strings, e.g. [\"id1\"]. Return [] if none are relevant."
                )}],
            )
            raw = resp.content[0].text.strip()
            logger.info("[chat] relevance raw: %s", raw)
            match = re.search(r'\[.*?\]', raw, re.DOTALL)
            ids = set(json.loads(match.group())) if match else set()
            logger.info("[chat] relevant ids: %s", ids)
            return [c for c in chunks if str(c["video_id"]) in ids]
        except Exception as e:
            logger.warning("[chat] relevance check failed (%s), falling back to threshold", e)
            return [c for c in chunks if c.get("similarity", 0) >= 0.55]

    def stream_response(
        self,
        message: str,
        history: list[dict],
        user_id: str,
    ) -> Generator[dict, None, None]:
        is_temporal = any(
            kw in message.lower()
            for kw in ["today", "this week", "last week", "recently", "when", "how many", "all my", "latest", "oldest"]
        )

        chunks = self.embedder.search_similar(message, user_id, limit=5)

        context_parts = [f"[{c['video_title']}]\n{c['content']}" for c in chunks]
        rag_context = "\n\n".join(context_parts) if context_parts else "No semantically relevant videos found."

        snapshot, recent_videos = self._build_library_snapshot(user_id)

        today_str = datetime.now(timezone.utc).strftime("%A, %B %d, %Y")
        system = BASE_SYSTEM_PROMPT + f"\n\nToday is {today_str}."

        full_context = f"Library Summary:\n{snapshot}\n\nRelevant content (semantic search):\n{rag_context}"

        # Kick off relevance check in background so it runs while text streams
        relevant_chunks: list[dict] = []
        relevance_thread: threading.Thread | None = None
        if not is_temporal:
            def _check() -> None:
                nonlocal relevant_chunks
                relevant_chunks = self._identify_relevant_chunks(message, chunks)
            relevance_thread = threading.Thread(target=_check, daemon=True)
            relevance_thread.start()

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

        seen_urls: set[str] = set()
        sources = []

        if is_temporal:
            for v in recent_videos:
                url = v.get("url", "")
                if url not in seen_urls:
                    seen_urls.add(url)
                    sources.append({"id": str(v["id"]), "url": url, "title": v.get("title") or "Untitled", "thumbnail_url": v.get("thumbnail_url")})
        else:
            if relevance_thread:
                relevance_thread.join(timeout=5)
            for c in relevant_chunks:
                if c["video_url"] not in seen_urls:
                    seen_urls.add(c["video_url"])
                    sources.append({"id": str(c["video_id"]), "url": c["video_url"], "title": c["video_title"], "thumbnail_url": c.get("thumbnail_url")})

        yield {"type": "sources", "urls": sources}


_chat_service: Optional[ChatService] = None


def get_chat_service() -> ChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service
