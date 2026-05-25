# Backend Handoff — 2026-05-13

## What's Done
- All endpoints built and tested (45 tests passing)
- JWT auth updated: HS256 → ES256/JWKS (Supabase rotated keys 2026-05-05)
- `config.py` fixed: `class Config` was outside `Settings`, now uses `SettingsConfigDict` with absolute `.env` path
- Dev auth bypass: no Authorization header in `environment=development` → returns `DEV_USER_ID`
- Profile endpoint auto-creates profile row if missing
- Profile endpoint returns email from Supabase auth
- Real API keys in `.env` (OpenAI + Anthropic)
- ffmpeg installed via brew

## How to Run
```bash
cd ~/Desktop/ReelActions/backend
uvicorn app.main:app --reload --host 0.0.0.0
```
`--host 0.0.0.0` required so physical device on same WiFi can reach it.

## Dev Config
- `DEV_USER_ID=a72e67a7-b3b8-4890-9c52-61a7be63639e` — test user in Supabase auth
- `environment=development` — enables auth bypass
- Frontend IP: `10.0.0.50` (Mac local network, may change)

## What's NOT Done
- **Supabase auth wiring in frontend** — backend is ready, frontend needs to send real JWT
- When auth is wired: update `dependencies.py` to remove dev bypass (or keep gated on `environment`)
- **Streak logic** — `current_streak` is never incremented (no streak calculation service built yet)

## Key Files
- `app/dependencies.py` — JWT auth + dev bypass
- `app/config.py` — settings with absolute `.env` path
- `app/api/profile.py` — auto-create profile + email fetch
- `app/services/classifier.py` — has debug print statements (remove before prod)
- `migrations/001_initial_schema.sql` — full DB schema

## Next Session
Nothing urgent on backend. Frontend drives what's needed next:
1. Library screen just uses existing `GET /api/v1/videos` — no backend changes needed
2. Chat SSE — `POST /api/v1/chat` already built
3. Auth wiring — needs real Supabase JWT from frontend sign-in
