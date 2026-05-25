# ReelActions — Backend

FastAPI backend for ReelActions. Accepts TikTok and Instagram Reel/carousel URLs, downloads audio or images, transcribes, classifies with Claude, stores structured knowledge in Supabase, and serves a RAG chat API.

## Stack

| Layer | Tech |
|---|---|
| API | Python + FastAPI |
| Video/audio | yt-dlp + TikWM (TikTok fallback) |
| Transcription | OpenAI Whisper (`whisper-1`, verbose_json) |
| Classification | Claude Haiku (`claude-haiku-4-5-20251001`) |
| Chat | Claude Sonnet (`claude-sonnet-4-6`) + RAG |
| Database | Supabase (PostgreSQL + pgvector + auth) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |

## Setup

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in keys
```

**.env keys:**

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
ADMIN_SECRET=
SLACK_WEBHOOK_URL=        # Discord webhook for alerts
REVENUECAT_WEBHOOK_SECRET=
SENTRY_DSN=               # optional, gated
```

## Run

```bash
arch -x86_64 python3.11 -m uvicorn app.main:app --reload --host 0.0.0.0
```

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/videos` | Submit a URL for processing |
| `GET` | `/api/v1/videos` | List user's saved videos |
| `GET` | `/api/v1/videos/{id}` | Get single video |
| `PATCH` | `/api/v1/videos/{id}/tried` | Mark video as tried |
| `GET` | `/api/v1/jobs/{job_id}` | Poll processing job status |
| `GET` | `/api/v1/profile` | Get profile + explorer stats |
| `POST` | `/api/v1/chat` | SSE streaming RAG chat |
| `POST` | `/api/v1/push-tokens` | Register Expo push token |
| `POST` | `/api/v1/webhooks/revenuecat` | RevenueCat billing webhook |
| `GET` | `/admin` | Admin dashboard (Basic Auth) |

All endpoints require a Supabase JWT in `Authorization: Bearer <token>` except webhooks and admin.

## Processing Pipeline

```
URL submitted
  → detect image or video
  → [video] download audio → transcribe (Whisper) → extract frames at vague-reference timestamps
  → [image] download images (up to 5)
  → classify (Claude Haiku) → category + title + summary + structured_data JSONB
  → embed chunks → pgvector
  → push notification to user
```

Job statuses: `queued` → `downloading` → `transcribing` → `classifying` → `embedding` → `completed` / `failed`

## Image Post Support

Instagram carousels (`/p/`) and TikTok photo posts (`/photo/`) are detected automatically. Images are downloaded and passed directly to the classifier — no audio step. Reels and TikTok videos use the normal audio pipeline with zero extra latency.

## Rate Limits

- Video submission: 20/hour per user
- Chat: 30/hour per user

## Tests

```bash
pytest tests/
```

## Migrations

Run SQL files in `migrations/` against your Supabase project in order:

```
migrations/001_initial_schema.sql
migrations/002_add_tried_at.sql
```
