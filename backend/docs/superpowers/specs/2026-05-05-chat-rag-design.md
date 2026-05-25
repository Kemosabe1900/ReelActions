# Chat / RAG Design

## Goal

Add a streaming chat endpoint to the ReelActions backend. Users ask questions across all their saved videos; the server does RAG over their transcript chunks, routes to the right Claude model, and streams the response back with source attribution.

---

## Endpoint

`POST /api/v1/chat`

**Request body:**
```json
{
  "message": "What recipes have I saved with under 30 min prep?",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

**Response:** `Content-Type: text/event-stream`

Three event types, in order:
```
data: {"type": "delta", "text": "You saved a pasta recipe"}

data: {"type": "sources", "urls": [{"url": "https://tiktok.com/...", "title": "Quick Pasta"}]}

data: [DONE]
```

- `delta` events carry text as it streams from Claude
- `sources` is sent once, after the full response, with deduplicated video URLs used as RAG context
- `[DONE]` signals the stream is closed

---

## Flow

1. Embed the user's message with `text-embedding-3-small`
2. Call `search_chunks` RPC — top 5 chunks for this user, returns `content`, `video_url`, `video_title` per chunk
3. Route to Claude model based on query length: ≤ 200 chars → Haiku, > 200 chars → Sonnet
4. Build prompt: system prompt + RAG chunks as context + last 6 messages from `history` + user message
5. Stream Claude response — emit `delta` events as text arrives
6. After stream closes, emit `sources` event with deduplicated URLs from the RAG chunks
7. Emit `[DONE]`
8. Write user message + full assistant response to `chat_messages` table (with `video_sources` JSONB) for mobile history persistence

---

## System Prompt

```
You are a personal knowledge assistant. The user has saved TikTok and Instagram Reels to build a knowledge base. Answer their question using only the context provided below — excerpts from their saved video transcripts. Be concise and specific. If the context doesn't contain enough information to answer, say so.
```

---

## Model Routing

| Condition | Model |
|---|---|
| `len(message) <= 200` | `claude-haiku-4-5-20251001` |
| `len(message) > 200` | `claude-sonnet-4-6` |

---

## Chat History Persistence

The client sends history with each request. The server does not read from `chat_messages` on the inference path — it only writes to it after each turn.

After the stream completes:
- Insert user message: `role="user"`, `content=message`, `video_sources=[]`
- Insert assistant message: `role="assistant"`, `content=<full response>`, `video_sources=[{url, title}, ...]`

The mobile app reads `chat_messages` to restore history on re-open.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `app/services/chat.py` | Create | RAG lookup, model routing, Claude streaming |
| `app/api/chat.py` | Create | SSE endpoint, request validation, DB writes |
| `app/main.py` | Modify | Register chat router |
| `tests/test_chat_service.py` | Create | Unit tests for ChatService |
| `tests/test_api_chat.py` | Create | Route tests for chat endpoint |

---

## Error Handling

- RAG search failure → 500, do not stream
- Claude API error mid-stream → emit `data: {"type": "error", "detail": "..."}` then close
- Missing/invalid auth → 401 (handled by existing `get_current_user` dependency)
