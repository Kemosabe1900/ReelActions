# ReelActions — Product & System Design

## Vision
A personal knowledge base for short-form video. Users save TikTok and Instagram Reels, the app extracts structured knowledge from each one, and they can query that knowledge anytime via cross-category chat or browse it by category. Not a step-by-step guide — a searchable brain dump that grows with the user.

---

## Product

### Core Loop
1. User saves a video (share sheet or paste URL)
2. App processes it: download audio → transcribe → classify → extract structured data → embed
3. Knowledge is added to the user's library under an auto-detected category
4. User queries their knowledge via chat or browses by category

### Navigation
- **Home** — recent saves, streak status, explorer score, resurfaced old saves
- **Chat** — cross-category RAG chat (Claude Sonnet). Ask anything across all saved videos.
- **Library** — browse all saves filtered by category. Tap a card to see structured data.
- **Profile** — subscription status, account settings

### Categories
Fully dynamic — Claude detects and creates categories from the user's content. No predefined list enforced on users.

- **Common categories** (Workouts, Recipes, Finance, etc.) get rich structured data schemas
- **Niche categories** (anything uncommon) get a generic schema: `key_concepts` + `action_items`
- Category appears immediately on first video — no minimum threshold
- Normalization: Claude maps new videos to the closest existing user category to prevent duplicates (e.g. "Gym" and "Fitness" don't become two separate categories)

### Tried Mechanic
Lightweight tag on any saved item — not a completion state. Users mark things as tried, not done. A recipe can be tried many times. Library is filterable by tried / untried.

### Gamification
- **Streaks** — daily engagement streak with 1 free skip per week
- **Explorer score** — "X of Y saves tried" displayed on Home tab
- Passive, no pressure — designed to bring users back without guilt-tripping them

### Monetization
- **7-day free trial** (card required upfront, auto-converts)
- **Monthly:** $12.99/month
- **Yearly:** $89.99/year (~$7.50/month)
- No tiers, no limits — full access on all plans
- Payment via App Store. Apply for Apple's Small Business Program (15% cut for developers under $1M/year revenue) — almost certain to qualify at launch. Pricing calculated with 15% cut; falls back to 30% math if not approved.

---

## Technical Architecture

### Stack
| Layer | Technology |
|---|---|
| Mobile | React Native + Expo |
| Backend | Python + FastAPI |
| Database | Supabase (Postgres + pgvector + auth) |
| Audio download | yt-dlp (audio-only, no video stored) |
| Transcription | OpenAI Whisper API |
| Classification | Claude Haiku (cost-optimized) |
| Chat | Claude Sonnet + RAG over pgvector |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |

### Input Handling (MVP)
1. **Audio transcription** — yt-dlp downloads audio-only, Whisper transcribes with `verbose_json` to get timestamps
2. **Targeted frame extraction** — scan transcript for vague references ("this", "these", "here", "use this", etc.), extract frames at exact timestamps via ffmpeg, pass to Claude Haiku vision during classification. Cap at 5 frames per video. Covers mid-video and end-of-video visual gaps.
3. **Subtitle fallback** — if audio produces no useful transcript, yt-dlp pulls auto-captions
4. **Vision (v2)** — full image carousels + silent video support. Classifier already accepts `transcript: str | None` and `images: list | None` so this slots in without restructuring.

### Processing Pipeline (fully built)
```
URL → downloader.py → transcriber.py → classifier.py → embedder.py → processor.py
```
Each stage updates job status in Supabase. Temp audio deleted immediately after transcription.

### Structured Data Model
`structured_data JSONB` column on the `videos` table. Classifier prompt branches per category.

**Workouts:**
```json
{
  "duration_minutes": null,
  "equipment": ["dumbbells", "mat"],
  "muscle_groups": ["chest", "triceps"],
  "exercises": [{ "name": "Push-ups", "sets": 3, "reps": 15, "rest_seconds": 60 }]
}
```

**Recipes:**
```json
{
  "prep_time_minutes": null,
  "cook_time_minutes": null,
  "servings": 4,
  "cuisine": "Italian",
  "ingredients": ["2 cups flour", "1 egg"],
  "steps": ["Mix dry ingredients", "Fold in wet ingredients"]
}
```

**Finance:**
```json
{
  "topic": "index funds",
  "key_concepts": ["diversification", "compound interest"],
  "action_items": ["Open a Roth IRA", "Set up auto-invest"],
  "risk_level": "low"
}
```

**Generic (unmapped categories):**
```json
{
  "key_concepts": ["..."],
  "action_items": ["..."]
}
```
Unmapped categories are flagged internally with a `schema_status: "pending_review"` field. When a new category accumulates real videos, review the actual content and define a proper rich schema before shipping that category's UI. Generic schema is a placeholder, not a permanent solution.

### Chat / RAG
- Cross-category: queries run across all of the user's transcript chunks
- Context window: last 6 messages + top 5 RAG chunks
- Model routing: Claude Haiku for simple/short queries, Claude Sonnet for complex ones
- Streaming: SSE
- Source attribution: every response includes the original URL(s) of videos used as context. Presentation format (inline citations vs source cards) decided during frontend design.

### Cost Controls
- **Video caching** — if two users submit the same URL, process once and share the transcript
- **Model routing** — Haiku for simple chat queries, Sonnet only when needed

---

## What's Built vs. What's Needed

### Built
- `config.py`, `database.py` — config + Supabase client
- `services/downloader.py` — yt-dlp audio wrapper
- `services/transcriber.py` — OpenAI Whisper client
- `services/classifier.py` — Claude Haiku classification + structured data extraction
- `services/embedder.py` — chunking + OpenAI embeddings + pgvector storage
- `workers/processor.py` — full 5-stage pipeline orchestrator

### Still to build
- `app/api/videos.py` — POST /api/v1/videos
- `app/api/jobs.py` — GET /api/v1/jobs/{job_id}
- `app/api/chat.py` — POST /api/v1/chat (SSE streaming)
- `app/api/library.py` — GET /api/v1/videos, GET /api/v1/videos/{id}
- `app/api/actions.py` — PATCH /api/v1/videos/{id}/tried
- `app/main.py` — FastAPI entry point + auth middleware
- `migrations/001_initial_schema.sql` — all tables + pgvector + RLS
- React Native mobile app

---

## V2 Roadmap
- Vision support (silent videos + image carousels)
- Books (summary sites or manual entry)
- AI-generated portrait: starts blurry/abstract at signup, progressively sharpens at badge milestones. Regeneration triggered by a progress score (weighted: saves + tries + streak + badges) at fixed thresholds — earned, not frequent (~5-10 generations per user lifetime). Each regeneration uses the previous image as a reference for consistency (same person, sharper). Image model TBD — needs evaluation on quality, cost, and multi-generation consistency before committing.
- Category-specific layout templates (beyond generic card)
