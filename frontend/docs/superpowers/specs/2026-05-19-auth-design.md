# Auth Design — ReelActions

**Date:** 2026-05-19  
**Status:** Approved  

---

## Overview

Wire Supabase authentication into the ReelActions frontend. Supports Apple Sign In, Google OAuth, and email/password. A `DEV_MODE` flag bypasses all auth during development so the app stays usable without logging in.

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `constants/config.ts` | `DEV_MODE` flag — flip to `false` before ship |
| `lib/supabase.ts` | Supabase client + `expo-secure-store` token adapter |
| `contexts/AuthContext.tsx` | Session state + sign-in/sign-up/sign-out methods |
| `app/(auth)/sign-in.tsx` | Sign-in screen (new) |

### Modified Files

| File | Change |
|------|--------|
| `app/index.tsx` | Auth guard: DEV_MODE → tabs, else check session |
| `app/_layout.tsx` | Wrap with `AuthProvider` |
| `app/(auth)/sign-up.tsx` | Full redesign per Stitch + wire to Supabase |
| `services/api.ts` | Attach `Authorization: Bearer <token>` from session |

### New Packages

- `@supabase/supabase-js`
- `expo-secure-store` — encrypted token storage on device
- `expo-apple-authentication` — native iOS Apple Sign In sheet
- `expo-auth-session` — PKCE OAuth flow for Google
- `expo-web-browser` — required by `expo-auth-session`
- `@react-native-async-storage/async-storage` — required by Supabase JS client

---

## DEV_MODE

`constants/config.ts` exports `DEV_MODE = true`.

**When `DEV_MODE = true`:**
- `app/index.tsx` redirects straight to `/(tabs)`, skipping all auth
- `AuthContext` provides `session = null`, skips all Supabase calls
- `services/api.ts` sends no `Authorization` header → backend dev bypass handles it (`DEV_USER_ID`)

**When `DEV_MODE = false`:**
- Full auth flow active
- `app/index.tsx` checks Supabase session → `/(tabs)` if exists, `/(auth)/sign-up` if not
- `api.ts` fetches session and attaches Bearer token on every request

Flip `DEV_MODE = false` before shipping.

---

## Auth Guard (`app/index.tsx`)

```
DEV_MODE = true  → <Redirect href="/(tabs)" />
DEV_MODE = false → loading (checking session)
                    session exists → <Redirect href="/(tabs)" />
                    no session     → <Redirect href="/(auth)/sign-up" />
```

`AuthContext` listens to `supabase.auth.onAuthStateChange` to keep session live.

---

## Token Storage & Session

- `expo-secure-store` adapter passed to Supabase client as `storage`
- Supabase auto-refreshes tokens; no manual refresh logic needed
- `api.ts` `request()` calls `supabase.auth.getSession()` and injects Bearer header

---

## Auth Screens

Both screens share the same layout structure (top → bottom):

1. Headline / tagline
2. **Sign in with Apple** button (native `expo-apple-authentication`, iOS only)
3. **Continue with Google** button (opens system browser via `expo-auth-session`)
4. `── OR EMAIL ──` divider
5. Email field (envelope icon) + Password field (lock icon + show/hide toggle)
6. Primary CTA button (green)
7. Terms of Service line
8. Sign-in/Sign-up toggle link at bottom

### sign-up.tsx
- Headline: "Turn passive scrolling into active achievements."
- CTA: "Continue with Email"
- Bottom link: "Already have an account? **Sign In**" → `/(auth)/sign-in`
- On success (any method): `router.replace('/(tabs)')`
- On error: inline error message below CTA (no alert popups)

### sign-in.tsx (new)
- Headline: "Welcome back."
- CTA: "Sign In"
- Bottom link: "Don't have an account? **Sign Up**" → `/(auth)/sign-up`
- On success: `router.replace('/(tabs)')`
- On error: inline error message below CTA

---

## OAuth Methods

### Apple Sign In
- Uses `expo-apple-authentication` — renders native iOS system sheet
- Required by App Store rules if any OAuth is offered
- Button only renders when `AppleAuthentication.isAvailableAsync()` returns true (iOS 13+, not available on Android or Expo Go) — hidden otherwise
- Flow: `AppleAuthentication.signInAsync()` → get `identityToken` → `supabase.auth.signInWithIdToken({ provider: 'apple', token })`

### Google Sign In
- Uses `expo-auth-session` + Supabase OAuth
- Opens device system browser (Safari on iOS, Chrome on Android) — user briefly leaves app
- Deep link callback: `reelactions://auth/callback` (register in `app.json` under `scheme`)
- Flow: `makeRedirectUri()` → `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo })` → browser → callback → session

### Email/Password
- Sign up: `supabase.auth.signUp({ email, password })`
- Sign in: `supabase.auth.signInWithPassword({ email, password })`

---

## Error Handling

- All errors shown inline below the relevant CTA — no `Alert.alert()`
- Apple auth: if `ERR_CANCELED` (user dismissed), silently ignore; other errors shown
- Google auth: if browser dismissed, silently ignore
- Network errors: show generic "Something went wrong" message

---

## Deep Link Config (`app.json`)

Add `"scheme": "reelactions"` to `expo` config. Required for Google OAuth callback.

---

## Supabase Config Requirements

Before testing with `DEV_MODE = false`:
1. Enable Apple provider in Supabase dashboard (needs Apple Developer account)
2. Enable Google provider in Supabase dashboard (needs Google Cloud OAuth credentials)
3. Add `reelactions://auth/callback` to allowed redirect URLs in Supabase

---

## Out of Scope

- Password reset / forgot password flow
- Email verification flow
- Profile management / account deletion
- Sign-out UI (no logout button yet)
