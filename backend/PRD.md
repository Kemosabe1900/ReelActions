# ReelActions — Product Requirements Document

**Version:** 2.0
**Date:** May 2026
**Status:** MVP

---

## 1. Problem Statement

People constantly save short-form videos (Instagram Reels, TikToks) containing useful knowledge — fitness routines, money tips, recipes, productivity hacks — and never act on them. The content sits forgotten in a "Saved" folder, providing zero value.

**ReelActions** turns that saved content into a personal knowledge base. Users save videos, the app extracts structured knowledge, and they can query it anytime through natural language chat or browse it by category. It's not a to-do list — it's a searchable brain dump that grows with the user.

---

## 2. Target User

- Age 18–35, heavy short-form video consumer
- Saves videos with the intention of using the knowledge later
- Struggles with follow-through because saved videos are hard to search and act on
- Uses both iOS and Android

---

## 3. Core Value Proposition

> Save a video → AI extracts the knowledge → query it anytime, across everything you've saved.

The primary experience is the chat: users ask "what pasta recipes did I save?" or "give me a 20-min workout from my saves" and the AI finds it across their entire library. The knowledge base becomes more valuable the more they save.

---

## 4. User Flow

1. User finds a useful Reel or TikTok
2. Taps **Share → ReelActions** from the native share sheet
3. App shows real-time processing status (Downloading → Transcribing → Analyzing → Done)
4. Knowledge is extracted and added to an auto-detected category in the library
5. User can immediately chat about it or browse it in the Library

---

## 5. MVP Features

### 5.1 Share Sheet Ingestion
- Receive shared URLs from Instagram and TikTok via native share sheet (iOS + Android)
- Validate URL before processing
- Show real-time processing status

### 5.2 Video Processing Pipeline
- Download audio-only (no video stored, temp files deleted immediately after transcription)
- Transcribe with OpenAI Whisper (`verbose_json` format to capture timestamps)
- Targeted frame extraction: scan transcript for vague references ("use this", "these", "here") → extract exact frames at those timestamps via ffmpeg → pass to Claude Haiku vision (max 5 frames/video)
- Subtitle fallback: if audio produces no useful transcript, pull auto-captions via yt-dlp
- Classify with Claude Haiku: detect category + extract structured data (JSONB per category)
- Store transcript chunks as embeddings for RAG search
- Video URL caching: if same URL already processed by any user, reuse the transcript/structured data

### 5.3 Categories
Fully dynamic — Claude detects and creates categories from the user's content. No hardcoded list.

- Common categories (Workouts, Recipes, Finance) get rich structured data schemas
- Niche/uncommon categories get a generic schema: key concepts + action items
- New categories are flagged `schema_status: pending_review` until a rich schema is defined
- Category appears immediately on first video — no minimum threshold
- Normalization: Claude maps new videos to the closest existing user category to avoid duplicates

**Common category schemas:**
- **Workouts:** `{ duration_minutes (nullable), equipment[], muscle_groups[], exercises[{ name, sets, reps, rest_seconds }] }`
- **Recipes:** `{ prep_time_minutes (nullable), cook_time_minutes (nullable), servings, cuisine, ingredients[], steps[] }`
- **Finance:** `{ topic, key_concepts[], action_items[], risk_level }`
- **Generic:** `{ key_concepts[], action_items[] }`

### 5.4 Navigation
Four tabs:
- **Home** — recent saves, streak status, explorer score, resurfaced old saves
- **Chat** — cross-category RAG chat. Ask anything across all saved videos.
- **Library** — browse all saves, filterable by category and tried/untried. Tap a card to see structured data.
- **Profile** — subscription status, account settings

### 5.5 Cross-Category Chat
- Single chat interface queries across all saved videos (not per-category)
- Context: last 6 messages + top 5 RAG chunks
- Model routing: Claude Haiku for simple queries, Claude Sonnet for complex ones
- SSE streaming responses
- Source attribution: every response surfaces the original video URL(s) used as context. Presentation format (inline citations vs. source cards) decided during frontend design.

### 5.6 Tried Mechanic
- Users mark saves as "tried" — not "done". A recipe can be tried many times.
- Library filterable by tried / untried
- Tried count tracked per save

### 5.7 Gamification
- **Streaks** — daily engagement streak with 1 free skip per week
- **Explorer score** — "X of Y saves tried" displayed on Home tab

### 5.8 User Accounts
- Email/password sign up and login via Supabase Auth
- Each user's data fully isolated (row-level security)

### 5.9 Monetization
- **7-day free trial** — card required upfront, auto-converts at end of trial
- **Monthly:** $12.99/month
- **Yearly:** $89.99/year (~$7.50/month)
- No tiers, no limits — full access on all plans
- Apply for Apple Small Business Program (15% App Store cut instead of 30%)

---

## 6. Out of Scope for MVP

- Push notifications or reminders
- Video playback inside the app
- Social / sharing between users
- Multiple languages
- Analytics dashboard
- Web app
- Books or non-video input sources (v2)
- Full vision support for silent videos / image carousels (v2)
- AI-generated portrait / knowledge visualization (v2)
- Category-specific UI layout templates beyond generic card (v2)

---

## 7. Technical Requirements

### 7.1 Performance
- Video processing must complete within 90 seconds for a typical 60-second video
- Chat responses must begin streaming within 3 seconds
- URL cache hit (same video shared again) must return instantly (<500ms)

### 7.2 Reliability
- If download fails (private video, geo-blocked), show a clear error — do not retry silently
- If classification fails to return valid JSON, retry once before marking job failed
- All temp audio files and extracted frames deleted immediately after classification

### 7.3 Security
- All API endpoints require a valid Supabase JWT
- Row-level security enforced at the database level
- No video files stored — audio processed and deleted
- API keys in environment variables only

### 7.4 Cost Controls
- Claude Haiku for classification (not Sonnet) — ~10x cheaper
- Audio-only download
- Chat context capped: last 6 messages + top 5 RAG chunks
- Video URL deduplication: same URL never reprocessed
- Model routing in chat: Haiku for simple queries, Sonnet only when needed
- Max 5 frames extracted per video for vision gap-filling

---

## 8. API Surface

```
POST   /api/v1/videos                    # Submit video URL for processing
GET    /api/v1/jobs/{job_id}             # Poll processing job status
GET    /api/v1/videos                    # List saved videos (filter by category, tried)
GET    /api/v1/videos/{id}               # Video detail with structured data
PATCH  /api/v1/videos/{id}/tried         # Toggle tried status
POST   /api/v1/chat                      # Send chat message (SSE streaming)
GET    /api/v1/chat/history              # Chat history
GET    /api/v1/profile                   # User profile + streak + explorer score
```

---

## 9. Data Model (Summary)

| Table | Purpose |
|---|---|
| `profiles` | User account, subscription status, streak, explorer score |
| `processing_jobs` | Async job status for video pipeline |
| `videos` | Processed video: transcript, summary, category, structured_data JSONB, tried |
| `transcript_chunks` | Chunked transcript embeddings (pgvector) for RAG |
| `chat_messages` | Chat history with video source attribution |

---

## 10. Success Metrics

1. **Activation:** User saves at least 1 video within first session
2. **Retention:** User opens app again within 7 days (streak mechanic drives this)
3. **Core action:** User marks at least 1 save as "tried"
4. **Chat engagement:** User asks at least 1 question in chat
5. **Conversion:** Trial → paid conversion rate

MVP is validated when a cohort of users is saving videos weekly, chatting with their knowledge base, and marking things as tried — without being prompted.

---

## 11. V2 Roadmap

- Vision support: silent videos + image carousels (Claude vision on full frames)
- Books: manual entry or summary site URL
- AI-generated portrait: starts blurry at signup, sharpens at badge milestones using image AI. Progress score (saves + tried + streak + badges) determines regeneration timing.
- Category-specific UI layout templates
- Push notifications / streak reminders
