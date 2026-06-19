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
  <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
  <Stack.Screen name="backup-offer" options={{ presentation: 'transparentModal', animation: 'fade' }} />
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
| User taps "X on paywall" | `router.push('/backup-offer')` |
| User taps "Already have account" | `router.push('/(auth)/sign-in')` |
| User taps "No thanks" on backup | `router.back()` |
| User taps backup backdrop | `router.back()` |
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
