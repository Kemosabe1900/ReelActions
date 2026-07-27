# ReelActions Frontend — Auth & Routing Architecture

## Core Principle

**Navigation state is NOT application state.** Routes are derived from app state, not the other way around. Screens trigger state changes; a coordinator derives the correct flow from state and redirects there. Screens NEVER call `router.replace('/(tabs)')` after auth/subscribe success.

## State Machine

Single source of truth: `AppStatus` enum from `contexts/AppStateContext.tsx`.

```ts
type AppStatus =
  | 'HYDRATING'          // Supabase/RC loading on cold launch
  | 'NEEDS_ONBOARDING'   // No onboarding_complete in AsyncStorage
  | 'NEEDS_SUBSCRIPTION' // Onboarding done, not subscribed (signed in or not)
  | 'NEEDS_REGISTRATION' // Anonymous purchase made, no Supabase account yet
  | 'AUTHENTICATED';     // Onboarding done, subscribed, signed in
```

Derivation:
```ts
if (authLoading || purchasesLoading || onboardingDone === null) return 'HYDRATING';
if (DEV_MODE) return 'AUTHENTICATED';
if (!onboardingDone) return 'NEEDS_ONBOARDING';
if (!isSubscribed) return 'NEEDS_SUBSCRIPTION';
if (isSubscribed && !session) return 'NEEDS_REGISTRATION';
return 'AUTHENTICATED';
```

## Implementation Pattern (Current — Working After Crashes)

We tried two patterns. The simpler one wins. **Use this:**

### Always-mounted Stack + StateGuard redirect

- `app/_layout.tsx` always mounts ALL routes in a single `<Stack>`
- `<StateGuard />` watches `status` and `segments`, calls `router.replace` to redirect to the home route for the current status when user is on a disallowed route
- `app/index.tsx` is the entry coordinator: uses `useAppState()` to render the right `<Redirect />` on launch

```tsx
// _layout.tsx
<Stack>
  <Stack.Screen name="(onboarding)" />
  <Stack.Screen name="(auth)" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="subscription" />
  <Stack.Screen name="chat" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
  <Stack.Screen name="category/[name]" />
  <Stack.Screen name="video/[id]" />
</Stack>
```

## What We Tried That Crashed

### Attempt 1: Conditional Stack rendering (Gemini's suggested pattern)

Returning different `<Stack>` JSX per status from RootNavigation. Pattern:

```tsx
switch (status) {
  case 'NEEDS_ONBOARDING':
    return <Stack><Stack.Screen name="(onboarding)" /></Stack>;
  case 'NEEDS_SUBSCRIPTION':
    return <Stack><Stack.Screen name="subscription" /> ...</Stack>;
  // ...
}
```

**Outcome:** App crashed immediately on launch. `EXC_BAD_ACCESS` in Hermes runtime. expo-router v6 (~6.0.23) does not support conditional Stack rendering cleanly — likely due to remount/initial route resolution issues. `Stack.Protected` is not available in this version (verified via grep on node_modules).

**Lesson:** Conditional Stack mounting is a Stack.Protected v7+ pattern. Don't try it again on v6.

### Attempt 2: Remove (auth)/_layout.tsx and (onboarding)/_layout.tsx

Tried flattening route groups by deleting their `_layout.tsx` files.

**Outcome:** Restored both. Removing them likely contributed to crash. The route group needs its own Stack layout for expo-router to resolve nested routes.

**Lesson:** Keep `_layout.tsx` for every route group.

## Anti-Patterns (Confirmed Bad)

- ❌ `router.replace('/(tabs)')` in any auth success handler — let state drive the route
- ❌ `useEffect` in subscription.tsx that watches `isSubscribed` and redirects — caused the "paywall slides up like a curtain" re-animation
- ❌ AsyncStorage flag `paywallDismissed` — we removed this. Hard gate = no dismiss.
- ❌ Calling `Purchases.configure()` on every userId change — must be called ONCE per app lifecycle. Use a `useRef(false)` guard.
- ❌ Sign-up link from sign-in screen — was a paywall bypass. Replaced with no link.
- ❌ Backup-offer discount modal — removed after App Store rejection flagged it as a manipulative sales tactic (dcf4839 unlinked it; screen fully deleted 2026-07-15). Do not reintroduce.
- ❌ Conditional `<Stack>` rendering per status — crashes in expo-router 6
- ❌ Deleting (auth)/_layout.tsx or (onboarding)/_layout.tsx — needed by expo-router

## Provider Hierarchy (Required Order)

```
PostHogProvider
  AuthProvider                            (provides useAuth)
    AppProviders                          (consumes useAuth, provides userId)
      PurchasesProvider                   (provides usePurchases)
        DataProvider
          AppStateProvider                (consumes useAuth + usePurchases)
            ShareIntentProvider
              ShareIntentHandler
              StateGuard
              Stack
                ... routes
```

`AppStateProvider` consumes both `useAuth` and `usePurchases`, so it must live below both providers.

## Navigation Rules

| When | Use |
|------|-----|
| User taps "Already have account" | `router.push('/(auth)/sign-in')` |
| Sign-in success | nothing — let state drive |
| Sign-up success | nothing — let state drive |
| Purchase success | nothing — let state drive |
| Restore success | nothing — let state drive |
| Sign-out | nothing — let state drive |
| Onboarding complete | `markOnboardingComplete()` only — no nav |

Exception: sign-in.tsx has a `useEffect` that calls `router.back()` when `session` becomes truthy. This pops the sign-in screen off the stack when user successfully signs in (so they don't see sign-in lingering after status changes).

## RevenueCat Lifecycle

CRITICAL bug we hit: `Purchases.configure()` was being called inside a `useEffect` that fired on every `userId` change. RC must be configured ONCE per app session. We use `useRef(false)` to track this and only configure on the first mount.

```ts
const configured = useRef(false);
useEffect(() => {
  if (!configured.current) {
    Purchases.configure({ apiKey });
    configured.current = true;
  }
  // Then logIn/logOut based on userId
}, [userId]);
```

`Purchases.logOut()` is only called when going from a known userId to undefined (sign-out). Not on initial mount.

## Files To Look At First (When Debugging Routing)

1. `contexts/AppStateContext.tsx` — state machine
2. `app/_layout.tsx` — StateGuard + Stack
3. `app/index.tsx` — entry coordinator
4. `app/+not-found.tsx` — share intent fallback
5. `contexts/PurchasesContext.tsx` — RC lifecycle

## Open Questions / Concerns

- New architecture (`newArchEnabled: true` in app.json) may cause native module incompatibilities. If crashes persist, try `false` as a fallback.
- `+not-found.tsx` redirects could theoretically loop if target route isn't mounted. Currently all routes are always mounted, so safe.
- StateGuard does `router.replace` which doesn't clear stack history. Stale routes can pile up under the current screen but aren't visible. Acceptable trade-off vs. crashing.

## Session Log (Newest First)

### 2026-07-19 (SUBMITTED for App Review)

Build 36 submitted to App Review by Mati (staged in prior session: build 36 + rewritten notes answering 2.1.0 App Completeness, demo video ReelActions-AppReview-demo.mp4, reviewer creds active+empty, manual release). New age-rating social-media questions answered No, rating stays 4+ (Sept 7 deadline satisfied). Now WAITING on Apple verdict.

While waiting, parked queue:
- Day-one update pile (build 37 polish + anything backend-only deploys via Railway anytime)
- yt-dlp update-check automation idea (from /btw)
- #9 onboarding answers persistence, 8 pre-existing test failures, home focus throttle + expo-image perf
- On APPROVAL + live: friend offer codes (ASC monthly sub > Offer Codes > Free, 1yr, 30 one-time codes; tell friends to cancel right after redeeming)

### 2026-07-14/15 late (TestFlight builds 35+36, monetization proven)

Builds 35 and 36 shipped to TestFlight (eas.json now has ascAppId 6773564841 so submits are non-interactive). Flags verified false before both. TestFlight findings, all resolved:
- Migration 009 RUN in Supabase: claim_next_job() wrote status 'processing' which the original check constraint rejected, so every claim failed post-deploy. Queue verified healthy after (stuck job claimed in seconds, attempts increments).
- Build 34 crash: structured_data ingredient objects rendered as React children. toText() defensive renderer in video/[id].tsx (in build 35).
- TRIAL PURCHASE WORKS (first time ever, June blocker dead). Full chain proven: device purchase → RC → webhook → profiles.subscription_status active.
- RC webhook was double-broken since June: URL missing /api/v1 (404s) + Authorization header mismatch (401s). Fixed in RC dashboard (URL edited, user re-entered Bearer+secret). Old failed events NOT retried on purpose (stale overwrites).
- Google sign-in "not working" = silent success: session useEffect pop was lost in a refactor. Restored (caa1b06) + social sign-in errors now go to Sentry (9a86620). Both in build 36, NOT in 35 — do not submit 35 to App Review.
- Home-flash-then-paywall on stale RC cache = accepted churned-subscriber trade, self-healing.
- Onboarding only shows when signed out AND not onboarded; Supabase session lives in SecureStore/Keychain and survives app deletion.

NEXT: TestFlight-verify build 36 (sign-in pop, then full checklist), then submit for App Review with 36.

Free access for ~30 friends (decided 2026-07-15): ONLY after app is approved and live on the App Store (no TestFlight distribution, per Mati). Then: App Store Connect > monthly sub > Offer Codes > Free type, 1 year, 30 one-time codes, text each friend their redemption link. No app code needed. MUST tell friends to cancel right after redeeming: free year survives cancellation, stops the $12.99/mo auto-renew at year end. Remaining: #9 onboarding answers persistence, 8 pre-existing test failures, home focus throttle + expo-image perf items.

### 2026-07-14 (security + queue + chat)

Pushed 7 commits (dd500af..): security batch (per-user rate limit keying by JWT sub, --proxy-headers in railpack/Procfile: limits were ONE shared bucket for all users behind Railway proxy; daily caps saves 100/chat 200; waitlist 5/hr IP; admin 3/hr; RC webhook fails closed in prod; blocked-IP 60s cache), durable job queue #11 (migration 008 RUN in Supabase: claim_next_job() SKIP LOCKED + 20min stale reclaim; worker thread in lifespan production-only; transient failures retry 2m/10m/30m/2h x5 then final fail + Discord; poll endpoint 6h backstop only), Apify fix (IG blocking reel-scraper systemically: public reels return no_items error items; retry once + fallback to apify/instagram-scraper), chat cards fix (summary videos join card pool; retrieval 5→15 chunks deduped per video, candidates enriched w/ category+summary, relevance returns ≤8 ranked, indirect matches allowed), personalized memory-jog chips from real save titles (ChatBottomSheet), RC subscription AsyncStorage cache (instant cold open, background verify).

Railway checks done: ENVIRONMENT=production, REVENUECAT_WEBHOOK_SECRET set, ADMIN_SECRET set. BYPASS_PAYWALL=true still uncommitted for Expo Go. Pre-existing test failures (8: profile/videos/chat_service) still parked. V2 idea noted: "What should I try today?" chip needs backend tried/untried support.

### 2026-07-13 (save quality + perf)

Pushed with this log: perf caching (1f62dd0: AsyncStorage library cache per user = instant cold open; video detail seeds from context) and four save-quality fixes in the classifier pipeline:
- a2e5439: classify from transcript AND caption (was either/or — captions discarded whenever speech passed 20 chars)
- 57f3de6: prompt bans meta-language ("the transcript appears to...") + post-parse hedge gate with one corrective retry + Discord alert if hedging survives; also instructs reconstruction of fragmented/non-native speech
- db16628: completeness rule — structured_data must capture every concrete detail (summary short, structured_data exhaustive)
- Option B in back pocket: swap retry model to Sonnet if Discord shows hedging surviving retries

Positioning decided: ReelActions = wellness/productivity app (behavior change), not save-organizer. Pricing stays $12.99/$89.99; ~88% margin; judge after ~100 trials. Makes #9 (persist onboarding answers) strategic.

NEXT SESSION: (1) re-save the recipe + broken-English workout test videos, verify quality; (2) Expo Go checklist (paste-save, duplicate+retry, optimistic actions, pull-refresh, sign-out no funnel); (3) flip BYPASS_PAYWALL=false, verify DEV_MODE/RESET_ONBOARDING false; (4) EAS build + TestFlight verify (task #15). Perf follow-ups parked: RC isSubscribed disk cache (kills cold-start HYDRATING wait), throttle home focus refresh 30s, expo-image for thumbs.

### 2026-07-11/12 (audit + fix marathon)

**Full app audit run, 10-item fix list executed (all but two parked items).**

Pushed to main (deployed via Railway, rollback tag `prod-2026-07-11` = bdab87f):
- Job timeout: 90s created_at check → 600s heartbeat staleness on new `updated_at` (migration 007, RUN in Supabase). Processor heartbeats per stage; `completed` never overwrites `failed`.
- Token fixes: AppState `startAutoRefresh`/`stopAutoRefresh` wiring in lib/supabase.ts (2-3 day logout bug); push token dedupe on register + DELETE /push-tokens + unregister on sign-out (cross-account notification leak).
- Save UX: slim SavingStrip replaces big processing card (escalation copy at 2.5 min); share-intent failures surface with real error + Retry; NotificationNavigator deep-links "Save ready!" push → video/[id].
- StateGuard now actually uses ALLOWED_BY_STATUS (was dead code) with useSegments.
- Sign-out no longer wipes onboarding_complete (funnel replay bug).
- Backend perf: frame extractor reuses downloaded video (was re-downloading up to 200MB), IG yt-dlp capped 30s, meta fetched only after successful download, TimeoutExpired now falls through to Apify.
- Optimistic toggleTried/deleteVideo/renameVideo in DataContext.
- Forgot-password: OTP flow ((auth)/forgot-password.tsx), verifyOtp type=recovery + updateUser. Supabase Reset Password template edited to send {{ .Token }}. NOTE: codes are 8 digits, field accepts 10.
- ErrorBoundary export in _layout, RefreshControl home/library, expo-haptics (NEW NATIVE MODULE → needs build).

Local, UNPUSHED: b71e736 (portrait blur-fill list thumbnails, components/VideoThumb.tsx), 47f2ca3 (video detail hero 380px blur-fill portrait + OTP field widened).

UNCOMMITTED ON PURPOSE: `BYPASS_PAYWALL = true` in constants/config.ts — Expo Go testing only (RC absent in Expo Go, can never be subscribed there). **FLIP BACK BEFORE EAS BUILD.**

Next session: flip flag → push b71e736+47f2ca3 → `eas build --platform ios --profile production` → TestFlight verify (strip+escalation, push tap opens video, sign-out keeps onboarding, forgot-password, retry on failed save, new thumbnails). Parked: onboarding answers persistence (#9), table-based job queue (#11 — full design in task, do before marketing push).

### 2026-06-13 (late, ending session)

**Where we are:**
- State machine + StateGuard architecture is committed and working
- App boots without crashing (build 20 on TestFlight)
- Onboarding shows on fresh install
- Paywall renders correctly
- X button → backup-offer modal works
- Backup-offer "No thanks" returns to paywall cleanly

**Bugs in build 20 that need next-build fixes:**

1. **"Start 14-day trial" button does nothing.** Visual press animation shows (green → darker green → back) but no purchase prompt. Root cause: RevenueCat `packages` is empty because App Store Connect subscriptions show "Ready to Submit" but aren't actually serviceable by StoreKit until the app is submitted for App Review WITH the subscriptions attached. Fix path: submit app for App Review.

2. **"Redeem Offer" on backup-offer button does nothing.** Same root cause as above.

3. **"Already have an account, Sign In" link does nothing.** Visual press animation shows but no navigation. Root cause discovered: `subscription` Stack.Screen had `presentation: 'modal'`. In our new pattern, subscription is the ROOT route for NEEDS_SUBSCRIPTION state (via Redirect from index.tsx) — not pushed onto something else. Modal-presented root screens have broken push navigation in expo-router 6. **FIX APPLIED (in code, awaiting next build)**: removed `presentation: 'modal'` from the subscription Stack.Screen entry in `app/_layout.tsx`. backup-offer and chat retained their `transparentModal` presentation since they ARE pushed on top of other screens.

4. **Sign In button on sign-in screen is gray, not green.** Reported by user, not yet investigated. Could be TestFlight cache. `cta` style uses `colors.primary` (#22c55e) which is green. Re-test after delete + reinstall + new build.

**StateGuard fix (in code, in build 20 but possibly cached):**
- Changed `ALLOWED_BY_STATUS` from exact-match `segments[0] === '(auth)'` to `segments.includes('(auth)') || segments.includes('sign-in') || segments.includes('sign-up')`. Allows the sign-in route to be reached without StateGuard immediately redirecting back to /subscription.

**EAS state:**
- Upgraded from Free to Starter ($19/mo) — got hit with build limit on free tier. EAS builds working again.
- iPhone TestFlight install needs a full delete + reinstall to clear AsyncStorage between builds. Updating in place doesn't wipe state.

**Next session priorities (in order):**

1. Run `eas build --platform ios --profile production` then `eas submit --platform ios --latest`
2. Delete app from iPhone, reinstall from TestFlight
3. Test that "Already have an account, Sign In" link now navigates (the modal fix)
4. Submit app for App Review with subscriptions attached → that unblocks the purchase buttons
5. Verify sign-in button greenness after fresh install
6. Re-test the bypass — confirm no path from paywall → sign-up without paying

### 2026-06-13 (earlier)
- Crash on launch with conditional Stack pattern. Reverted to always-mounted Stack + StateGuard. Fixed `Purchases.configure()` re-call bug.
- Refactor from PaywallGate + scattered `router.replace` calls to centralized state machine after Gemini + GPT both confirmed the pattern.

### 2026-06-12
- Hit paywall stacking, restore button re-animation, sign-up bypass. All patched individually before realizing architectural problem.
