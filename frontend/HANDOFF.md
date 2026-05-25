# Frontend Handoff — 2026-05-13

## What's Done
- Home screen wired to real API (videos + profile)
- Profile screen wired to real API (email-derived name, real stats)
- `SaveVideoSheet` — paste URL → submits → polls job → refreshes on complete
- `services/api.ts` — central API client for all endpoints
- Video pipeline tested end-to-end ✅

## Current State
- `BASE_URL = 'http://10.0.0.50:8000/api/v1'` — hardcoded local IP, change if Mac IP changes
- Auth bypass active — no Bearer token sent, backend accepts unauthenticated requests in dev
- Onboarding disabled — `app/index.tsx` routes straight to `/(tabs)`

## What's NOT Done Yet
1. **Library screen** (`app/(tabs)/library.tsx`) — still hardcoded mock data, needs `api.videos.list()` grouped by category
2. **Chat** (`components/ChatBottomSheet.tsx`) — UI exists, not wired to `api.chat.stream()` SSE
3. **Supabase auth** — sign-up/login not wired, dev bypass must be replaced before shipping

## Next Session — Start Here
Wire library screen first:
- Fetch `api.videos.list()` → group by `video.category`
- Each category = a section with its cards
- Empty state when no videos
- Then wire chat SSE into ChatBottomSheet

## Key Files
- `services/api.ts` — all API calls live here
- `components/SaveVideoSheet.tsx` — URL submission + polling
- `components/ChatBottomSheet.tsx` — chat UI (needs SSE wiring)
- `app/(tabs)/library.tsx` — next target
