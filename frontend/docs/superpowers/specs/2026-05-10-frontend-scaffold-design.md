# ReelActions Frontend Scaffold — Design Spec

**Date:** 2026-05-10  
**Status:** Approved

---

## Overview

Scaffold the ReelActions React Native mobile app using Expo Router, implementing all screens designed in Stitch. The app connects to the existing FastAPI backend at `reelactions-backend`.

---

## Tech Stack

- **Framework:** React Native + Expo (managed workflow)
- **Navigation:** Expo Router (file-based)
- **Language:** TypeScript
- **Design source:** Stitch (ReelActions Stealth design system)

---

## Design System

All design tokens extracted from Stitch into `constants/theme.ts`:

**Colors:**
- Background: `#0e150e`
- Surface: `#1a221a`
- Primary (Action Green): `#22c55e`
- Secondary (Achievement Gold): `#f5a623`
- On-surface: `#dce5d9`
- On-surface-variant: `#bccbb9`
- Outline: `#869585`

**Typography (Hanken Grotesk):**
- display-lg: 32px, weight 800
- headline-md: 24px, weight 700
- title-lg: 18px, weight 600
- body-base: 16px, weight 400
- body-sm: 14px, weight 400
- label-caps: 12px, weight 700, letter-spacing 0.05em

**Spacing:**
- container-padding: 20px
- stack-gap: 16px
- card-inner: 16px
- element-tight: 8px
- nav-height: 72px

**Border radius:**
- sm: 4px, default: 8px, md: 12px, lg: 16px, xl: 24px, full: 9999px

---

## Project Structure

```
frontend/
  app/
    _layout.tsx                  ← root layout, dark background
    (onboarding)/
      _layout.tsx
      index.tsx                  ← Pitch screen
      insight-1.tsx
      insight-2.tsx
      insight-3.tsx
      question-1.tsx
      question-2.tsx
    (auth)/
      _layout.tsx
      sign-up.tsx
    (tabs)/
      _layout.tsx                ← bottom tab bar
      index.tsx                  ← Home
      library.tsx                ← Library
      assistant.tsx              ← AI Assistant
      profile.tsx                ← Profile
    subscription.tsx
  components/                    ← shared UI components
  constants/
    theme.ts                     ← all design tokens
  assets/
```

---

## Navigation Flow

```
App launch
  └── Onboarding (first time only)
        Pitch → Insight 1 → Insight 2 → Insight 3 → Question 1 → Question 2
          └── Auth
                Sign Up
                  └── Tabs (main app)
                        Home | Library | AI Assistant | Profile
                          └── Subscription (modal, triggered by paywall)
```

---

## Build Order

1. `constants/theme.ts` — design tokens
2. Root `_layout.tsx` — dark background, status bar
3. Onboarding screens (Pitch → Insights → Questions)
4. Sign Up screen
5. Tab navigator + Home
6. Library + Workout Library
7. AI Assistant
8. Profile
9. Subscription

---

## Constraints

- No hardcoded color/spacing values in screen files — always reference `theme.ts`
- Hanken Grotesk loaded via `@expo-google-fonts/hanken-grotesk`
- No auth logic wired yet — screens are UI-only until backend integration phase
- No video playback (out of scope per backend spec)
