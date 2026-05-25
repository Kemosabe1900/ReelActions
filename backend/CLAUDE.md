# ReelActions — Project Context

## What This Is
A cross-platform mobile app (iOS + Android) that is a **personal knowledge base** for short-form video. Users save TikTok and Instagram Reels, the app extracts structured knowledge from each one, and they can query it anytime via cross-category RAG chat or browse by category. Not a step-by-step guide — a searchable brain dump that grows with the user.

## Key Documents
- `docs/superpowers/specs/2026-05-02-reelactions-design.md` — full product & system design spec (source of truth)
- `docs/superpowers/plans/` — implementation plans per subsystem

## Tech Stack
- Mobile: React Native + Expo
- Backend: Python + FastAPI
- Audio download: yt-dlp (audio-only, never store video)
- Transcription: OpenAI Whisper API (`whisper-1`) with `verbose_json` for timestamps
- Frame extraction: ffmpeg (targeted frames at vague-reference timestamps)
- Classification: Claude Haiku (`claude-haiku-4-5-20251001`) — returns category + title + summary + structured_data JSONB
- Chat: Claude Sonnet (`claude-sonnet-4-6`) with cross-category RAG over pgvector
- Database: Supabase (PostgreSQL + pgvector + auth)
- Embeddings: OpenAI text-embedding-3-small (1536 dims)

## Categories
Fully dynamic — Claude detects and creates categories from user content. No hardcoded list.
- Common categories (Workouts, Recipes, Finance) get rich JSONB schemas
- Niche categories get generic schema: `{ key_concepts: [], action_items: [] }`
- New categories get `schema_status: "pending_review"` until a rich schema is defined

## Structured Data (JSONB per category)
Stored in `videos.structured_data`. Examples:

**Workouts:** `{ duration_minutes: null, equipment: [], muscle_groups: [], exercises: [{ name, sets, reps, rest_seconds }] }`
**Recipes:** `{ prep_time_minutes: null, cook_time_minutes: null, servings, cuisine, ingredients: [], steps: [] }`
**Finance:** `{ topic, key_concepts: [], action_items: [], risk_level }`
**Generic:** `{ key_concepts: [], action_items: [] }`

## Input Handling
1. Audio transcription (primary) — yt-dlp + Whisper `verbose_json`
2. Targeted frame extraction — scan transcript for vague references ("this", "these", "here"), extract frames at exact timestamps via ffmpeg, pass to Haiku vision. Cap: 5 frames/video.
3. Subtitle fallback — yt-dlp pulls auto-captions if audio produces no useful transcript
4. Vision v2 — full image carousels + silent video (classifier accepts `transcript: str | None`, `images: list | None`)

## Monetization
- 7-day free trial (card required upfront, auto-converts)
- Monthly: $12.99/month
- Yearly: $89.99/year
- No tiers, no limits — full access
- Apply for Apple Small Business Program (15% cut instead of 30%)

## Gamification
- Streaks with 1 weekly skip
- Explorer score (X/Y saves tried)
- Tried mechanic: lightweight tag on saves, not completion state

## Chat / RAG
- Cross-category: queries across all user transcript chunks
- Context: last 6 messages + top 5 RAG chunks
- Model routing: Haiku for simple queries, Sonnet for complex
- SSE streaming
- Source attribution: every response includes video URL(s) used as context

## Video Caching
If two users submit the same URL, process once and reuse. Check `videos.url` before processing.

## What's Built

### Backend — Complete (45 tests passing)
- `app/config.py` — pydantic-settings config
- `app/database.py` — Supabase client singleton (`get_db()`)
- `app/services/downloader.py` — yt-dlp audio-only wrapper
- `app/services/transcriber.py` — Whisper verbose_json + subtitle fallback
- `app/services/classifier.py` — Claude Haiku, JSONB schemas per category, vision support
- `app/services/embedder.py` — chunk + embed + pgvector storage
- `app/services/frame_extractor.py` — targeted ffmpeg frames at vague-reference timestamps
- `app/services/chat.py` — RAG lookup, model routing, Claude streaming
- `app/workers/processor.py` — full pipeline orchestrator (URL caching + frame extraction)
- `app/dependencies.py` — `get_current_user` JWT dependency (PyJWT, HS256)
- `app/api/videos.py` — POST /videos, GET /videos, GET /videos/{id}, PATCH /videos/{id}/tried
- `app/api/jobs.py` — GET /jobs/{job_id}
- `app/api/profile.py` — GET /profile with live explorer stats
- `app/api/chat.py` — POST /chat SSE streaming endpoint
- `app/main.py` — FastAPI app, all routers registered

### Mobile App — Design In Progress
Being designed in Claude Design (claude.ai/design). See memory for design decisions.

## Build Order (Plans)
1. ✅ DB migrations (`docs/superpowers/plans/2026-05-03-01-database-schema.md`)
2. ✅ Pipeline updates (`docs/superpowers/plans/2026-05-03-02-pipeline-updates.md`)
3. ✅ API + Auth (`docs/superpowers/plans/2026-05-05-03-api-auth.md`)
4. ✅ Chat / RAG (`docs/superpowers/plans/2026-05-05-04-chat-rag.md`)
5. 🔄 Mobile app — React Native + Expo (separate project, design in progress)

## Key Constraints
- Always use Claude Haiku for classification (cost)
- Audio-only downloads, temp files deleted immediately after transcription
- Max 5 frames extracted per video for vision
- Chat context: last 6 messages + top 5 RAG chunks
- Dynamic categories — never hardcode a category list
- Strict MVP — no features beyond spec
