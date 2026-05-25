# ReelActions Frontend Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the ReelActions React Native mobile frontend with Expo Router, implementing all screens from the Stitch design system as UI-only components.

**Architecture:** Migrate the blank-typescript Expo project to Expo Router with file-based routing. Route groups handle onboarding `(onboarding)`, auth `(auth)`, and main `(tabs)`. All design tokens live in `constants/theme.ts`. Screens are UI-only — no backend integration in this phase.

**Tech Stack:** React Native, Expo SDK 54, Expo Router, TypeScript, @expo-google-fonts/hanken-grotesk, expo-font, react-native-safe-area-context

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Delete | `App.tsx` | Replaced by Expo Router |
| Delete | `index.ts` | Replaced by expo-router/entry |
| Modify | `package.json` | Change main to expo-router/entry |
| Modify | `app.json` | Add scheme, dark UI style, update splash |
| Create | `constants/theme.ts` | All design tokens |
| Create | `app/_layout.tsx` | Root layout, font loading, dark background |
| Create | `app/(onboarding)/_layout.tsx` | Onboarding stack navigator |
| Create | `app/(onboarding)/index.tsx` | Pitch screen |
| Create | `app/(onboarding)/insight-1.tsx` | Insight 1 screen |
| Create | `app/(onboarding)/insight-2.tsx` | Insight 2 screen |
| Create | `app/(onboarding)/insight-3.tsx` | Insight 3 screen |
| Create | `app/(onboarding)/question-1.tsx` | Question 1 screen |
| Create | `app/(onboarding)/question-2.tsx` | Question 2 screen |
| Create | `app/(auth)/_layout.tsx` | Auth stack navigator |
| Create | `app/(auth)/sign-up.tsx` | Sign Up screen |
| Create | `app/(tabs)/_layout.tsx` | Bottom tab navigator |
| Create | `app/(tabs)/index.tsx` | Home screen |
| Create | `app/(tabs)/library.tsx` | Library screen |
| Create | `app/(tabs)/assistant.tsx` | AI Assistant screen |
| Create | `app/(tabs)/profile.tsx` | Profile screen |
| Create | `app/subscription.tsx` | Subscription modal |
| Create | `components/Button.tsx` | Reusable primary/secondary button |
| Create | `components/ProgressBar.tsx` | Onboarding progress indicator |

---

### Task 1: Install Expo Router and dependencies

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Delete: `App.tsx`, `index.ts`

- [ ] **Step 1: Install Expo Router and required peer dependencies**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-font @expo-google-fonts/hanken-grotesk expo-splash-screen
```

- [ ] **Step 2: Change package.json main field**

Open `package.json` and change:
```json
"main": "index.ts",
```
to:
```json
"main": "expo-router/entry",
```

- [ ] **Step 3: Update app.json**

Replace the full contents of `app.json` with:
```json
{
  "expo": {
    "name": "ReelActions",
    "slug": "reelactions",
    "scheme": "reelactions",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0e150e"
    },
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0e150e"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    }
  }
}
```

- [ ] **Step 4: Delete App.tsx and index.ts**

```bash
rm /Users/matinemera/Desktop/ReelActions/frontend/App.tsx
rm /Users/matinemera/Desktop/ReelActions/frontend/index.ts
```

- [ ] **Step 5: Commit**

```bash
cd /Users/matinemera/Desktop/ReelActions/frontend
git init
git add package.json app.json
git commit -m "feat: migrate to expo-router, install font and nav dependencies"
```

---

### Task 2: Design tokens

**Files:**
- Create: `constants/theme.ts`

- [ ] **Step 1: Create constants directory and theme file**

Create `constants/theme.ts`:

```typescript
export const colors = {
  background: '#0e150e',
  surface: '#1a221a',
  surfaceHigh: '#242c24',
  surfaceHighest: '#2f372e',
  primary: '#22c55e',
  primaryDim: '#4ae176',
  onPrimary: '#003915',
  secondary: '#f5a623',
  onSecondary: '#452b00',
  onSurface: '#dce5d9',
  onSurfaceVariant: '#bccbb9',
  outline: '#869585',
  outlineVariant: '#3d4a3d',
  error: '#ffb4ab',
  errorContainer: '#93000a',
};

export const typography = {
  displayLg: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38, letterSpacing: -0.64 },
  headlineMd: { fontSize: 24, fontWeight: '700' as const, lineHeight: 29 },
  titleLg: { fontSize: 18, fontWeight: '600' as const, lineHeight: 25 },
  bodyBase: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelCaps: { fontSize: 12, fontWeight: '700' as const, lineHeight: 12, letterSpacing: 0.6 },
};

export const spacing = {
  containerPadding: 20,
  stackGap: 16,
  cardInner: 16,
  elementTight: 8,
  navHeight: 72,
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};
```

- [ ] **Step 2: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: add design tokens from Stitch design system"
```

---

### Task 3: Shared components

**Files:**
- Create: `components/Button.tsx`
- Create: `components/ProgressBar.tsx`

- [ ] **Step 1: Create Button component**

Create `components/Button.tsx`:

```typescript
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radii, typography } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading = false }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[styles.base, isPrimary ? styles.primary : styles.ghost]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  label: {
    ...typography.titleLg,
  },
  labelPrimary: {
    color: colors.onPrimary,
  },
  labelGhost: {
    color: colors.onSurface,
  },
});
```

- [ ] **Step 2: Create ProgressBar component**

Create `components/ProgressBar.tsx`:

```typescript
import { View, StyleSheet } from 'react-native';
import { colors, radii } from '@/constants/theme';

type ProgressBarProps = {
  total: number;
  current: number;
};

export function ProgressBar({ total, current }: ProgressBarProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.segment, i < current ? styles.active : styles.inactive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
  },
  active: {
    backgroundColor: colors.primary,
  },
  inactive: {
    backgroundColor: colors.outlineVariant,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add components/
git commit -m "feat: add Button and ProgressBar shared components"
```

---

### Task 4: Root layout with font loading

**Files:**
- Create: `app/_layout.tsx`

- [ ] **Step 1: Create root layout**

Create `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
```

- [ ] **Step 2: Verify the app starts without crashing**

```bash
npx expo start --web
```

Expected: browser opens, dark background, no errors in console.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add root layout with Hanken Grotesk font loading"
```

---

### Task 5: Onboarding layout and Pitch screen

**Files:**
- Create: `app/(onboarding)/_layout.tsx`
- Create: `app/(onboarding)/index.tsx`

- [ ] **Step 1: Create onboarding stack layout**

Create `app/(onboarding)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
```

- [ ] **Step 2: Create Pitch screen**

Create `app/(onboarding)/index.tsx`:

```typescript
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing } from '@/constants/theme';

export default function PitchScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.logo}>ReelActions</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BETA</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.headline}>
            Turn what you watch{'\n'}into what you do.
          </Text>
          <Text style={styles.subtext}>
            Save TikToks and Reels. Get structured, actionable plans. Build the habits you actually want.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button label="Get Started" onPress={() => router.push('/(onboarding)/insight-1')} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'center',
    gap: 48,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.labelCaps,
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  body: {
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  subtext: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.elementTight,
  },
});
```

- [ ] **Step 3: Verify Pitch screen renders**

```bash
npx expo start --web
```

Expected: dark screen with "ReelActions" logo, headline, and two buttons visible.

- [ ] **Step 4: Commit**

```bash
git add app/(onboarding)/
git commit -m "feat: add onboarding layout and pitch screen"
```

---

### Task 6: Insight screens

**Files:**
- Create: `app/(onboarding)/insight-1.tsx`
- Create: `app/(onboarding)/insight-2.tsx`
- Create: `app/(onboarding)/insight-3.tsx`

- [ ] **Step 1: Create Insight 1 screen**

Create `app/(onboarding)/insight-1.tsx`:

```typescript
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, typography, spacing } from '@/constants/theme';

export default function Insight1Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar total={5} current={1} />
      </View>

      <View style={styles.content}>
        <Text style={styles.stat}>87%</Text>
        <Text style={styles.headline}>of saved videos are{'\n'}never watched again.</Text>
        <Text style={styles.body}>
          You save content with the best intentions. But the algorithm keeps moving, and your saves collect dust.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button label="Next" onPress={() => router.push('/(onboarding)/insight-2')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'center',
    gap: spacing.stackGap,
  },
  stat: {
    fontSize: 64,
    fontWeight: '800',
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: colors.primary,
    lineHeight: 72,
  },
  headline: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  body: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
  },
});
```

- [ ] **Step 2: Create Insight 2 screen**

Create `app/(onboarding)/insight-2.tsx`:

```typescript
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, typography, spacing } from '@/constants/theme';

export default function Insight2Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar total={5} current={2} />
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>One tap to save.{'\n'}AI does the rest.</Text>
        <Text style={styles.body}>
          Share any TikTok or Reel to ReelActions. We transcribe it, extract the key steps, and turn it into a plan you can actually follow.
        </Text>
        <View style={styles.exampleCard}>
          <Text style={styles.exampleLabel}>WORKOUT REEL → ACTION PLAN</Text>
          <Text style={styles.exampleItem}>• 4 sets of 10 Bulgarian split squats</Text>
          <Text style={styles.exampleItem}>• 3 sets of 12 Romanian deadlifts</Text>
          <Text style={styles.exampleItem}>• Rest 90 seconds between sets</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button label="Next" onPress={() => router.push('/(onboarding)/insight-3')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'center',
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  body: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  exampleCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.cardInner,
    gap: spacing.elementTight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  exampleLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
    marginBottom: 4,
  },
  exampleItem: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
  },
});
```

- [ ] **Step 3: Create Insight 3 screen**

Create `app/(onboarding)/insight-3.tsx`:

```typescript
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, typography, spacing } from '@/constants/theme';

export default function Insight3Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar total={5} current={3} />
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>Your saves.{'\n'}Your knowledge base.</Text>
        <Text style={styles.body}>
          Ask your library anything. "What's a good leg workout from my saves?" ReelActions searches across everything you've saved and answers with sources.
        </Text>
        <View style={styles.chatPreview}>
          <View style={styles.userBubble}>
            <Text style={styles.userBubbleText}>Give me a 20-min leg day from my saves</Text>
          </View>
          <View style={styles.aiBubble}>
            <Text style={styles.aiBubbleText}>Based on your saves, here's a 20-min circuit from @fitnesscoach...</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button label="Next" onPress={() => router.push('/(onboarding)/question-1')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'center',
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  body: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  chatPreview: {
    gap: spacing.elementTight,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userBubbleText: {
    ...typography.bodySm,
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  aiBubbleText: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
  },
});
```

- [ ] **Step 4: Verify navigation works through insights**

```bash
npx expo start --web
```

Expected: tap "Get Started" on Pitch → Insight 1 → Insight 2 → Insight 3, progress bar advances.

- [ ] **Step 5: Commit**

```bash
git add app/(onboarding)/insight-1.tsx app/(onboarding)/insight-2.tsx app/(onboarding)/insight-3.tsx
git commit -m "feat: add onboarding insight screens"
```

---

### Task 7: Question screens

**Files:**
- Create: `app/(onboarding)/question-1.tsx`
- Create: `app/(onboarding)/question-2.tsx`

- [ ] **Step 1: Create Question 1 screen**

Create `app/(onboarding)/question-1.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, typography, spacing, radii } from '@/constants/theme';

const OPTIONS = ['Fitness & Workouts', 'Recipes & Cooking', 'Finance & Investing', 'Productivity', 'Other'];

export default function Question1Screen() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar total={5} current={4} />
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>What do you save most?</Text>
        <Text style={styles.subtext}>We'll personalize your library layout.</Text>

        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.option, selected === option && styles.optionSelected]}
              onPress={() => setSelected(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, selected === option && styles.optionTextSelected]}>
                {option}
              </Text>
              {selected === option && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={() => router.push('/(onboarding)/question-2')}
          loading={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 40,
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  subtext: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  options: {
    gap: spacing.elementTight,
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.cardInner,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHigh,
  },
  optionText: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  optionTextSelected: {
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  check: {
    color: colors.primary,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
  },
});
```

- [ ] **Step 2: Create Question 2 screen**

Create `app/(onboarding)/question-2.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { colors, typography, spacing, radii } from '@/constants/theme';

const OPTIONS = ['Daily', 'A few times a week', 'Weekends only', 'Whenever I remember'];

export default function Question2Screen() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ProgressBar total={5} current={5} />
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>How often do you want to act on your saves?</Text>
        <Text style={styles.subtext}>This helps us set your streak goals.</Text>

        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.option, selected === option && styles.optionSelected]}
              onPress={() => setSelected(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, selected === option && styles.optionTextSelected]}>
                {option}
              </Text>
              {selected === option && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Let's Go"
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 40,
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  subtext: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  options: {
    gap: spacing.elementTight,
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.cardInner,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHigh,
  },
  optionText: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  optionTextSelected: {
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  check: {
    color: colors.primary,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(onboarding)/question-1.tsx app/(onboarding)/question-2.tsx
git commit -m "feat: add onboarding question screens"
```

---

### Task 8: Auth layout and Sign Up screen

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Create auth layout**

Create `app/(auth)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
```

- [ ] **Step 2: Create Sign Up screen**

Create `app/(auth)/sign-up.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radii } from '@/constants/theme';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.headline}>Create your account</Text>
          <Text style={styles.subtext}>Start turning your saves into action.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholderTextColor={colors.outline}
                placeholder="you@example.com"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholderTextColor={colors.outline}
                placeholder="At least 8 characters"
              />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Button label="Create Account" onPress={() => router.replace('/(tabs)')} />
          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.link}>Terms</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  back: {
    fontSize: 24,
    color: colors.onSurface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 40,
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  subtext: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  form: {
    gap: spacing.stackGap,
    marginTop: 8,
  },
  field: {
    gap: 6,
  },
  label: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.cardInner,
    height: 52,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.stackGap,
    alignItems: 'center',
  },
  terms: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/
git commit -m "feat: add auth layout and sign up screen"
```

---

### Task 9: Tab navigator

**Files:**
- Create: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create tab layout**

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '⊞',
    Library: '◫',
    Assistant: '◎',
    Profile: '○',
  };
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.icon, focused && styles.iconActive]}>{icons[label]}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Library" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Assistant" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    height: spacing.navHeight,
    paddingBottom: 0,
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 22,
    color: colors.onSurfaceVariant,
  },
  iconActive: {
    color: colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: colors.onSurfaceVariant,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: add tab navigator"
```

---

### Task 10: Home screen

**Files:**
- Create: `app/(tabs)/index.tsx`

- [ ] **Step 1: Create Home screen**

Create `app/(tabs)/index.tsx`:

```typescript
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radii } from '@/constants/theme';

const RECENT_SAVES = [
  { id: '1', title: '10-min ab circuit', category: 'Fitness', tried: false },
  { id: '2', title: 'High protein pasta recipe', category: 'Recipes', tried: true },
  { id: '3', title: 'How to invest your first $1k', category: 'Finance', tried: false },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.name}>Your ReelActions</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakCount}>7</Text>
          </View>
        </View>

        <View style={styles.explorerCard}>
          <Text style={styles.explorerLabel}>EXPLORER SCORE</Text>
          <Text style={styles.explorerScore}>3 of 12 saves tried</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={styles.explorerCta}>Try something new today →</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Saves</Text>
          {RECENT_SAVES.map((save) => (
            <TouchableOpacity key={save.id} style={styles.saveCard} activeOpacity={0.7}>
              <View style={styles.saveMeta}>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>{save.category}</Text>
                </View>
                {save.tried && (
                  <View style={styles.triedChip}>
                    <Text style={styles.triedText}>TRIED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.saveTitle}>{save.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    paddingBottom: spacing.navHeight + 20,
    gap: spacing.stackGap,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  name: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  streakBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  streakEmoji: { fontSize: 16 },
  streakCount: {
    ...typography.titleLg,
    color: colors.secondary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  explorerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 8,
  },
  explorerLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  explorerScore: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  explorerCta: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  section: {
    gap: spacing.elementTight,
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
    marginBottom: 4,
  },
  saveCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.cardInner,
    gap: 8,
  },
  saveMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  triedChip: {
    backgroundColor: colors.primary + '20',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  triedText: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  saveTitle: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: add home screen with explorer score and recent saves"
```

---

### Task 11: Library screen

**Files:**
- Create: `app/(tabs)/library.tsx`

- [ ] **Step 1: Create Library screen**

Create `app/(tabs)/library.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radii } from '@/constants/theme';

const CATEGORIES = ['All', 'Fitness', 'Recipes', 'Finance', 'Productivity'];

const SAVES = [
  { id: '1', title: '10-min ab circuit', category: 'Fitness', tried: false, duration: '0:58' },
  { id: '2', title: 'High protein pasta', category: 'Recipes', tried: true, duration: '1:20' },
  { id: '3', title: 'Invest your first $1k', category: 'Finance', tried: false, duration: '2:10' },
  { id: '4', title: 'Bulgarian split squat guide', category: 'Fitness', tried: true, duration: '0:45' },
  { id: '5', title: 'Pomodoro method explained', category: 'Productivity', tried: false, duration: '1:05' },
];

export default function LibraryScreen() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? SAVES
    : SAVES.filter((s) => s.category === activeCategory);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.count}>{SAVES.length} saves</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.categoryPillText, activeCategory === cat && styles.categoryPillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((save) => (
          <TouchableOpacity key={save.id} style={styles.card} activeOpacity={0.7}>
            <View style={styles.thumbnail}>
              <Text style={styles.thumbnailText}>▶</Text>
              <Text style={styles.duration}>{save.duration}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{save.title}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardCategory}>{save.category}</Text>
                {save.tried && <Text style={styles.cardTried}>· Tried</Text>}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    marginBottom: spacing.elementTight,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  count: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  categories: {
    paddingHorizontal: spacing.containerPadding,
    gap: 8,
    paddingBottom: spacing.stackGap,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  categoryPillTextActive: {
    color: colors.onPrimary,
  },
  list: {
    paddingHorizontal: spacing.containerPadding,
    gap: spacing.elementTight,
    paddingBottom: spacing.navHeight + 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    gap: spacing.cardInner,
    padding: spacing.cardInner,
    alignItems: 'center',
  },
  thumbnail: {
    width: 64,
    height: 64,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  thumbnailText: {
    fontSize: 20,
    color: colors.onSurfaceVariant,
  },
  duration: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    ...typography.labelCaps,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 9,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 4,
  },
  cardCategory: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  cardTried: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_400Regular',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/library.tsx
git commit -m "feat: add library screen with category filter"
```

---

### Task 12: AI Assistant screen

**Files:**
- Create: `app/(tabs)/assistant.tsx`

- [ ] **Step 1: Create AI Assistant screen**

Create `app/(tabs)/assistant.tsx`:

```typescript
import { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, typography, spacing, radii } from '@/constants/theme';

type Message = { id: string; role: 'user' | 'assistant'; content: string; source?: string };

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Ask me anything about your saved videos. I can find workouts, recipes, tips — whatever you need.',
  },
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  function sendMessage() {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Searching your library...',
      source: 'tiktok.com/@example/video/123',
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={spacing.navHeight}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Assistant</Text>
          <Text style={styles.subtitle}>Searches your library</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={msg.role === 'user' ? styles.userRow : styles.aiRow}>
              <View style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
                  {msg.content}
                </Text>
                {msg.source && (
                  <Text style={styles.source}>Source: {msg.source}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your library..."
            placeholderTextColor={colors.outline}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} activeOpacity={0.8}>
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    paddingBottom: spacing.elementTight,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  messages: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 20,
    gap: spacing.elementTight,
  },
  userRow: { alignItems: 'flex-end' },
  aiRow: { alignItems: 'flex-start' },
  userBubble: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    gap: 6,
  },
  userText: {
    ...typography.bodyBase,
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  aiText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  source: {
    ...typography.bodySm,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: spacing.stackGap,
    paddingTop: spacing.elementTight,
    gap: spacing.elementTight,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.cardInner,
    paddingVertical: 12,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 20,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/assistant.tsx
git commit -m "feat: add AI assistant chat screen"
```

---

### Task 13: Profile screen

**Files:**
- Create: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Create Profile screen**

Create `app/(tabs)/profile.tsx`:

```typescript
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radii } from '@/constants/theme';

const STATS = [
  { label: 'Saves', value: '12' },
  { label: 'Tried', value: '3' },
  { label: 'Streak', value: '7🔥' },
];

const SETTINGS = ['Notifications', 'Subscription', 'Privacy Policy', 'Terms of Service', 'Sign Out'];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <Text style={styles.username}>matiabeya2@gmail.com</Text>

        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.settingsList}>
          {SETTINGS.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.settingsRow}
              onPress={item === 'Subscription' ? () => router.push('/subscription') : undefined}
              activeOpacity={0.7}
            >
              <Text style={[styles.settingsLabel, item === 'Sign Out' && styles.danger]}>
                {item}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: spacing.navHeight + 20,
    alignItems: 'center',
    gap: spacing.stackGap,
  },
  header: {
    width: '100%',
    paddingTop: spacing.stackGap,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'HankenGrotesk_700Bold',
    color: colors.onPrimary,
  },
  username: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.elementTight,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.cardInner,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  statLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  settingsList: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.cardInner,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  settingsLabel: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  danger: {
    color: colors.error,
  },
  chevron: {
    fontSize: 20,
    color: colors.onSurfaceVariant,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat: add profile screen"
```

---

### Task 14: Subscription screen

**Files:**
- Create: `app/subscription.tsx`

- [ ] **Step 1: Create Subscription screen**

Create `app/subscription.tsx`:

```typescript
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radii } from '@/constants/theme';

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: '$12.99', sub: 'per month', recommended: false },
  { id: 'yearly', label: 'Yearly', price: '$89.99', sub: '$7.50/mo · Save 42%', recommended: true },
];

const FEATURES = [
  'Unlimited video saves',
  'AI-powered action plans',
  'Cross-library chat',
  'Streak & gamification',
  'Priority processing',
];

export default function SubscriptionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Go Pro</Text>
        <Text style={styles.subtext}>Everything you need to turn saves into habits.</Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {PLANS.map((plan) => (
            <TouchableOpacity key={plan.id} style={[styles.planCard, plan.recommended && styles.planCardActive]} activeOpacity={0.8}>
              {plan.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>BEST VALUE</Text>
                </View>
              )}
              <Text style={styles.planLabel}>{plan.label}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planSub}>{plan.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button label="Start 7-Day Free Trial" onPress={() => {}} />
        <Text style={styles.legal}>Card required. Cancel anytime.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: spacing.containerPadding,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: colors.onSurfaceVariant,
  },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 60,
    paddingBottom: 40,
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  subtext: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  features: {
    gap: spacing.elementTight,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  featureCheck: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  featureText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  plans: {
    flexDirection: 'row',
    gap: spacing.elementTight,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHigh,
  },
  recommendedBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  recommendedText: {
    ...typography.labelCaps,
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  planLabel: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  planPrice: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  planSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
  },
  legal: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Final verification — navigate through the full app flow**

```bash
npx expo start --web
```

Expected flow: Pitch → Insight 1 → 2 → 3 → Question 1 → 2 → Sign Up → Home (tabs) → Library → Assistant → Profile → Subscription modal. No crashes, dark theme throughout, green accents.

- [ ] **Step 3: Final commit**

```bash
git add app/subscription.tsx
git commit -m "feat: add subscription screen — frontend scaffold complete"
```

---

## Post-Implementation Checklist

- [ ] All screens render on web without errors
- [ ] Navigation flows end-to-end: onboarding → auth → tabs
- [ ] All colors reference `theme.ts` — no hardcoded hex values in screen files
- [ ] Hanken Grotesk loaded and applied across all text
- [ ] Dark background on splash (`#0e150e`)
- [ ] Tab bar visible on all main screens
- [ ] Subscription opens as modal from Profile
