import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, PanResponder, useWindowDimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { GlassPillThumb } from '@/components/GlassPillThumb';
import { colors, spacing, radii } from '@/constants/theme';
import { usePostHog } from 'posthog-react-native';
import { useAppState } from '@/contexts/AppStateContext';

const TOTAL = 20;
const SOFT_RED = '#c97a6a';
const AMBER = '#d4956a';

const THUMB_W = 26;
const THUMB_R = THUMB_W / 2;
const SLIDER_CPS = [0, 10, 30, 50, 70, 90];

// ── Sub-components ──

function WhatsAppLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </Svg>
  );
}

function InstagramLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#fff" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </Svg>
  );
}

function TikTokLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#fff" d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.65a8.18 8.18 0 004.78 1.52V6.69a4.85 4.85 0 01-1.01 0z" />
    </Svg>
  );
}

function MessengerLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#fff" d="M12 0C5.373 0 0 4.975 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242A12.47 12.47 0 0012 22.222c6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
    </Svg>
  );
}

function PrimaryBtn({ label, onPress, disabled, marginTop }: { label: string; onPress: () => void; disabled?: boolean; marginTop?: number | 'auto' }) {
  return (
    <TouchableOpacity
      style={[st.primaryBtn, disabled && { opacity: 0.35 }, marginTop !== undefined && { marginTop }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text style={st.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function GhostBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={st.ghostBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={st.ghostBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChoiceBtn({
  label, selected, onPress,
}: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[st.choice, selected && st.choiceSel]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[st.choiceText, selected && st.choiceTextSel]}>{label}</Text>
    </TouchableOpacity>
  );
}

function IconChoiceBtn({
  icon, label, sublabel, selected, onPress,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; sublabel?: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[st.iconChoice, selected && st.iconChoiceSel]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[st.iconChoiceBadge, selected && st.iconChoiceBadgeSel]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[st.iconChoiceLabel, selected && st.iconChoiceLabelSel]}>{label}</Text>
        {sublabel ? <Text style={st.iconChoiceSub}>{sublabel}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function PercentSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const { width: sw } = useWindowDimensions();
  const usableW = sw - spacing.containerPadding * 2 - THUMB_W;

  const cpToX = (pct: number) => {
    const i = SLIDER_CPS.indexOf(pct);
    return i < 0 ? 0 : (i / (SLIDER_CPS.length - 1)) * usableW;
  };

  const xToCP = (x: number) => {
    const clamped = Math.max(0, Math.min(x, usableW));
    const i = Math.round((clamped / usableW) * (SLIDER_CPS.length - 1));
    return SLIDER_CPS[Math.max(0, Math.min(i, SLIDER_CPS.length - 1))];
  };

  const animX = useRef(new Animated.Value(value != null ? cpToX(value) : 0)).current;
  const grantX = useRef(value != null ? cpToX(value) : 0);

  const snapTo = (pct: number) => {
    const x = cpToX(pct);
    grantX.current = x;
    Animated.spring(animX, { toValue: x, useNativeDriver: false, tension: 600, friction: 35 }).start();
    onChange(pct);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = Math.max(0, Math.min(e.nativeEvent.locationX - THUMB_R, usableW));
        animX.setValue(x); grantX.current = x;
      },
      onPanResponderMove: (_, gs) => {
        animX.setValue(Math.max(0, Math.min(grantX.current + gs.dx, usableW)));
      },
      onPanResponderRelease: (_, gs) => {
        snapTo(xToCP(Math.max(0, Math.min(grantX.current + gs.dx, usableW))));
      },
      onPanResponderTerminate: () => { snapTo(xToCP(grantX.current)); },
    })
  ).current;

  const PILL_W = 52;
  const PILL_H = 34;

  return (
    <View style={{ gap: 4 }}>
      <Text style={st.sliderBigVal}>{value != null ? `${value}%` : '—'}</Text>
      <View style={[st.sliderContainer, { height: 60 }]} {...panResponder.panHandlers}>
        <View
          style={{ position: 'absolute', left: THUMB_R, right: THUMB_R, top: 27 }}
          pointerEvents="none"
        >
          <View style={st.sliderTrack}>
            <Animated.View style={[st.sliderFill, { width: animX }]} />
          </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: PILL_W,
            height: PILL_H,
            borderRadius: PILL_H / 2,
            overflow: 'hidden',
            top: 30 - PILL_H / 2,
            transform: [{ translateX: Animated.add(animX, new Animated.Value(THUMB_R - PILL_W / 2)) }],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          <GlassPillThumb width={PILL_W} height={PILL_H} />
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={st.sliderEndLabel}>0%</Text>
        <Text style={st.sliderEndLabel}>90%</Text>
      </View>
    </View>
  );
}

function VPWSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { width: sw } = useWindowDimensions();
  const usableW = sw - spacing.containerPadding * 2 - THUMB_W;
  const valToX = (v: number) => ((v - 1) / 99) * usableW;
  const xToVal = (x: number) => Math.round((Math.max(0, Math.min(x, usableW)) / usableW) * 99) + 1;
  const animX = useRef(new Animated.Value(valToX(value))).current;
  const grantX = useRef(valToX(value));
  const commit = (x: number) => {
    grantX.current = x;
    onChange(xToVal(x));
  };
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = Math.max(0, Math.min(e.nativeEvent.locationX - THUMB_R, usableW));
      animX.setValue(x);
      commit(x);
    },
    onPanResponderMove: (_, gs) => {
      const x = Math.max(0, Math.min(grantX.current + gs.dx, usableW));
      animX.setValue(x);
      onChange(xToVal(x));
    },
    onPanResponderRelease: (_, gs) => {
      commit(Math.max(0, Math.min(grantX.current + gs.dx, usableW)));
    },
    onPanResponderTerminate: () => { commit(grantX.current); },
  })).current;

  const PILL_W = 52;
  const PILL_H = 34;

  return (
    <View style={{ gap: 4 }}>
      <Text style={st.sliderRowLabel}>Videos saved per week</Text>
      <View style={[st.sliderContainer, { height: 60 }]} {...panResponder.panHandlers}>
        <View
          style={{ position: 'absolute', left: THUMB_R, right: THUMB_R, top: 27 }}
          pointerEvents="none"
        >
          <View style={st.sliderTrack}>
            <Animated.View style={[st.sliderFill, { width: animX }]} />
          </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: PILL_W,
            height: PILL_H,
            borderRadius: PILL_H / 2,
            overflow: 'hidden',
            top: 30 - PILL_H / 2,
            transform: [{ translateX: Animated.add(animX, new Animated.Value(THUMB_R - PILL_W / 2)) }],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          <GlassPillThumb width={PILL_W} height={PILL_H} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: PILL_W,
            top: -6,
            alignItems: 'center',
            transform: [{ translateX: Animated.add(animX, new Animated.Value(THUMB_R - PILL_W / 2)) }],
          }}
        >
          <Text style={st.pillThumbVal}>{value}</Text>
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={st.sliderEndLabel}>1</Text>
        <Text style={st.sliderEndLabel}>100</Text>
      </View>
    </View>
  );
}

function StepHeader({ num, total }: { num: number; total: number }) {
  const pct = Math.round((num / total) * 100);
  return (
    <View style={st.stepHeader}>
      <View style={st.stepHeaderRow}>
        <Text style={st.stepLabel}>
          STEP {String(num).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Text>
        <Text style={st.stepPct}>{pct}% complete</Text>
      </View>
      <View style={st.stepTrack}>
        <View style={[st.stepFill, { width: `${pct}%` as any }]} />
      </View>
    </View>
  );
}

// ── Main component ──

const STEP_NAMES: Record<number, string> = {
  0: 'intro', 1: 'pain_videos_saved', 2: 'pain_videos_used', 3: 'social_proof',
  4: 'personalise_count', 5: 'personalise_categories', 6: 'emotional_cost',
  7: 'broken_system', 8: 'product_intro', 9: 'how_share', 10: 'how_process',
  11: 'how_notify', 12: 'inside_app', 13: 'ai_search', 14: 'platform_support',
  15: 'features', 16: 'commitment', 17: 'habit_assessment', 18: 'ready',
  19: 'create_account', 20: 'completion',
};

export default function OnboardingScreen() {
  const posthog = usePostHog();
  const { markOnboardingComplete } = useAppState();
  const [step, setStep] = useState(0);
  const [q1Pick, setQ1Pick] = useState<number | null>(null);
  const [q2Pick, setQ2Pick] = useState<number | null>(null);
  const [categories, setCategories] = useState<Set<number>>(new Set());
  const [q17Pick, setQ17Pick] = useState<number>(0);
  const [q17Touched, setQ17Touched] = useState(false);
  const [vpw, setVpw] = useState(15);
  const [vpwTouched, setVpwTouched] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    posthog?.capture('onboarding_step_viewed', { step, step_name: STEP_NAMES[step] });
  }, [step]);

  const goTo = (n: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setStep(n);
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const next = () => goTo(step + 1);

  const finish = async () => {
    await markOnboardingComplete();
  };

  const toggleCategory = (i: number) => {
    setCategories(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  const renderStep = () => {
    switch (step) {

      // ── INTRO ──

      case 0:
        return (
          <View style={st.screen}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start', gap: 16 }}>
              <Image
                source={require('@/assets/logo-transparent.png')}
                style={{ width: 72, height: 72, marginBottom: 8 }}
                resizeMode="contain"
              />
              <Text style={st.introHeroLogo}>
                {'Reel'}<Text style={{ color: colors.primary }}>{'Actions'}</Text>
              </Text>
              <Text style={st.introTagline}>
                Your saved videos are going to waste.
              </Text>
            </View>
            <View style={{ gap: 16 }}>
              <Text style={st.introSupporting}>Sorted. Searchable. Actually useful.</Text>
              <PrimaryBtn label="Get Started" onPress={next} />
              <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={st.introSignIn}>Already have an account? <Text style={{ color: colors.primary, fontFamily: 'HankenGrotesk_700Bold' }}>Sign in</Text></Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      // ────────────────────────────────────────
      // PHASE 1 — PAIN
      // ────────────────────────────────────────

      case 1:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>BE HONEST</Text>
            <Text style={st.headline}>
              How many videos have you saved{' '}
              <Text style={[st.headline, { color: colors.primary }]}>this month?</Text>
            </Text>
            <View style={st.choiceList}>
              {(
                [
                  { icon: 'bookmark-outline', label: 'A handful', sublabel: 'Maybe 5–10 videos' },
                  { icon: 'bookmarks-outline', label: 'A moderate amount', sublabel: 'Somewhere around 20–50' },
                  { icon: 'albums-outline', label: 'A lot, honestly', sublabel: 'Over 100 easily' },
                  { icon: 'infinite-outline', label: "I've lost count", sublabel: "It's completely out of hand" },
                ] as const
              ).map((item, i) => (
                <IconChoiceBtn
                  key={i}
                  icon={item.icon}
                  label={item.label}
                  sublabel={item.sublabel}
                  selected={q1Pick === i}
                  onPress={() => setQ1Pick(i)}
                />
              ))}
            </View>
            </View>
            <PrimaryBtn label="That's me" onPress={next} disabled={q1Pick === null} />
          </View>
        );

      case 2:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>REAL TALK</Text>
            <Text style={st.headline}>
              How many have you actually{' '}
              <Text style={[st.headline, { color: SOFT_RED }]}>used?</Text>
            </Text>
            <Text style={st.body}>
              The workout. The recipe. The tip you needed to remember.
            </Text>
            <View style={st.choiceList}>
              {[
                "Most of them, I'm organized",
                'A few here and there',
                'Barely any',
                'None. I never go back.',
              ].map((label, i) => (
                <ChoiceBtn
                  key={i}
                  label={label}
                  selected={q2Pick === i}
                  onPress={() => setQ2Pick(i)}
                />
              ))}
            </View>
            </View>
            <PrimaryBtn label="Continue" onPress={next} disabled={q2Pick === null} />
          </View>
        );

      case 3:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>YOU ARE NOT ALONE</Text>
            <Text style={st.headline}>
              Most people are{' '}
              <Text style={[st.headline, { color: colors.primary }]}>exactly the same.</Text>
            </Text>
            <View style={st.rule} />
            <View style={st.bigStatBlock}>
              <Text style={[st.bigNum, { color: SOFT_RED }]}>80%</Text>
              <Text style={st.bigSub}>
                of saved content is never revisited. It just sits there.
              </Text>
            </View>
            <View style={st.rule} />
            <View style={st.bigStatBlock}>
              <Text style={[st.bigNum, { color: AMBER }]}>47 videos</Text>
              <Text style={st.bigSub}>
                saved every week by the average person. Only 2 get revisited. Ever.
              </Text>
            </View>
            </View>
            <PrimaryBtn label="Keep going" onPress={next} />
          </View>
        );

      // ────────────────────────────────────────
      // PHASE 2 — NUMBERS + PERSONALISE
      // ────────────────────────────────────────

      case 4: {
        const totalSaved = vpw * 52;
        const lostForever = Math.round(totalSaved * 0.8);
        const actuallyUsed = Math.round(totalSaved * 0.2);
        return (
          <View style={st.screen}>
            <View style={[st.screenBody, { transform: [{ translateY: -24 }] }]}>
            <Text style={st.eyebrow}>YOUR SAVES, BY THE NUMBERS</Text>
            <Text style={st.headline}>
              See what you've been{' '}
              <Text style={[st.headline, { color: colors.primary }]}>missing.</Text>
            </Text>
            <VPWSlider value={vpw} onChange={(v) => { setVpw(v); setVpwTouched(true); }} />
            <View style={st.liveBox}>
              <Text style={st.liveNum}>{totalSaved}</Text>
              <Text style={st.liveLabel}>videos saved this year</Text>
            </View>
            <View style={st.statRow}>
              <View style={st.statRowCell}>
                <Text style={[st.statRowNum, { color: SOFT_RED }]}>{lostForever}</Text>
                <Text style={st.statRowLabel}>Lost forever</Text>
              </View>
              <View style={st.statRowDivider} />
              <View style={st.statRowCell}>
                <Text style={[st.statRowNum, { color: colors.primary }]}>{actuallyUsed}</Text>
                <Text style={st.statRowLabel}>Actually revisited</Text>
              </View>
            </View>
            </View>
            <PrimaryBtn label="That's a lot to lose" onPress={next} disabled={!vpwTouched} />
          </View>
        );
      }

      case 5:
        return (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={st.scrollScreen}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 20 }}>
              <Text style={st.eyebrow}>PERSONALIZE</Text>
              <Text style={st.headline}>
                What do you save{' '}
                <Text style={[st.headline, { color: colors.primary }]}>most?</Text>
              </Text>
              <Text style={st.body}>Pick everything that applies. This shapes your experience.</Text>
              <View style={st.choiceList}>
                {[
                  'Workouts and fitness',
                  'Recipes and cooking',
                  'Life hacks and productivity',
                  'Learning and self-improvement',
                  'Travel and places',
                  'Finance and money tips',
                ].map((label, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[st.choice, categories.has(i) && st.choiceSel]}
                    onPress={() => toggleCategory(i)}
                    activeOpacity={0.8}
                  >
                    <Text style={[st.choiceText, categories.has(i) && st.choiceTextSel]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <PrimaryBtn label="That's what I save" onPress={next} disabled={categories.size === 0} marginTop="auto" />
          </ScrollView>
        );

      // ────────────────────────────────────────
      // PHASE 3 — EMOTIONAL COST + REFRAME
      // ────────────────────────────────────────

      case 6:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>THINK ABOUT IT</Text>
            <Text style={st.headline}>
              Those were not just{' '}
              <Text style={[st.headline, { color: SOFT_RED }]}>videos.</Text>
            </Text>
            {[
              {
                title: 'The workout program you saved in January.',
                sub: 'Still not started.',
              },
              {
                title: 'That pasta recipe that looked incredible.',
                sub: 'Never cooked.',
              },
              {
                title: 'The money tip that could have saved you hundreds.',
                sub: 'Never applied.',
              },
            ].map((card, i) => (
              <View key={i} style={st.dcard}>
                <Text style={st.dcardTitle}>{card.title}</Text>
                <Text style={[st.dcardSub, { color: SOFT_RED }]}>{card.sub}</Text>
              </View>
            ))}
            <Text style={st.body}>
              This is not about content.{' '}
              <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>
                It is about the version of yourself you keep putting off.
              </Text>
            </Text>
            </View>
            <PrimaryBtn label="I need to fix this" onPress={next} />
          </View>
        );

      case 7:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>HERE'S THE THING</Text>
            <Text style={st.headline}>
              You're not lazy.{' '}
              <Text style={[st.headline, { color: colors.primary }]}>
                The system is broken.
              </Text>
            </Text>
            <Text style={st.body}>
              TikTok and Instagram were built to keep you scrolling. Your saved folder is a black
              hole by design.
            </Text>
            <View style={st.dcard}>
              <Text style={[st.body, { color: 'rgba(255,255,255,0.45)', lineHeight: 24 }]}>
                No search. No folders. No reminders. No structure. Just a list that never ends.
              </Text>
            </View>
            <Text style={st.body}>
              The problem is not you.{' '}
              <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>
                There has just been no tool built for this.
              </Text>
              {'\n\n'}Until now.
            </Text>
            </View>
            <PrimaryBtn label="Tell me more" onPress={next} />
          </View>
        );

      // ────────────────────────────────────────
      // PHASE 4 — PRODUCT INTRO
      // ────────────────────────────────────────

      case 8:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.introLabel}>
              {'Introducing Reel'}
              <Text style={[st.introLabel, { color: colors.primary }]}>{'Actions'}</Text>
            </Text>
            <Text style={st.headline}>
              Turns saved videos into{' '}
              <Text style={[st.headline, { color: colors.primary }]}>
                things you actually do.
              </Text>
            </Text>
            <Text style={st.body}>
              Works in the background. You keep scrolling. We handle everything else.
            </Text>
            <View style={st.statGrid}>
              {[
                { num: 'Auto', label: 'sorts into folders' },
                { num: 'AI', label: 'pulls key info out' },
                { num: 'Search', label: 'anything, anytime' },
                { num: 'Zero', label: 'manual work ever' },
              ].map((s, i) => (
                <View key={i} style={st.statCell}>
                  <Text style={st.statNum}>{s.num}</Text>
                  <Text style={st.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            </View>
            <PrimaryBtn label="Show me how" onPress={next} />
          </View>
        );

      case 9:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>STEP 1 OF 3</Text>
            <Text style={st.headline}>
              See a video.{' '}
              <Text style={[st.headline, { color: colors.primary }]}>One tap.</Text>
            </Text>
            <Text style={st.body}>
              Hit share on any TikTok or Reel.{' '}
              {'Reel'}
              <Text style={[st.body, { color: colors.primary }]}>{'Actions'}</Text>
              {' '}is in your share sheet. Tap it and keep scrolling.
            </Text>
            <View style={st.shareSheet}>
              <View style={st.shareHandle} />
              <Text style={st.shareTitle}>Share to</Text>
              <View style={st.shareAppsRow}>
                <View style={st.shareApp}>
                  <View style={[st.shareIcon, { backgroundColor: '#25D366' }]}>
                    <WhatsAppLogo size={28} />
                  </View>
                  <Text style={st.shareAppName}>WhatsApp</Text>
                </View>
                <View style={st.shareApp}>
                  <View style={[st.shareIcon, { overflow: 'hidden' }]}>
                    <Svg width={58} height={58} viewBox="0 0 58 58" style={{ position: 'absolute' }}>
                      <Defs>
                        <LinearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
                          <Stop offset="0" stopColor="#f09433" />
                          <Stop offset="0.25" stopColor="#e6683c" />
                          <Stop offset="0.5" stopColor="#dc2743" />
                          <Stop offset="0.75" stopColor="#cc2366" />
                          <Stop offset="1" stopColor="#bc1888" />
                        </LinearGradient>
                      </Defs>
                      <Rect width={58} height={58} fill="url(#ig)" />
                    </Svg>
                    <InstagramLogo size={28} />
                  </View>
                  <Text style={st.shareAppName}>Instagram</Text>
                </View>
                <View style={st.shareApp}>
                  <View style={[st.shareIcon, { backgroundColor: '#0084FF' }]}>
                    <MessengerLogo size={28} />
                  </View>
                  <Text style={st.shareAppName}>Messenger</Text>
                </View>
                <View style={st.shareApp}>
                  <View style={[st.shareIcon, { backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: colors.primary }]}>
                    <Image
                      source={require('@/assets/logo-transparent.png')}
                      style={{ width: 32, height: 32 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[st.shareAppName, { color: colors.primary }]}>ReelActions</Text>
                </View>
              </View>
            </View>
            <Text style={st.body}>
              One tap.{' '}
              <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>
                Then keep scrolling. You never leave the app.
              </Text>
            </Text>
            </View>
            <PrimaryBtn label="Then what happens?" onPress={next} />
          </View>
        );

      case 10:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>STEP 2 OF 3</Text>
            <Text style={st.headline}>
              You scroll.{' '}
              <Text style={[st.headline, { color: colors.primary }]}>We work.</Text>
            </Text>
            <Text style={st.body}>
              The moment you share,{' '}
              {'Reel'}
              <Text style={[st.body, { color: colors.primary }]}>{'Actions'}</Text>
              {' '}processes everything in the background. No waiting. No switching apps.
            </Text>
            <View style={st.dcard}>
              {[
                { title: 'Video received', sub: 'Pulled from TikTok instantly', done: true },
                { title: 'Content analysed', sub: 'Category: Fitness 🏋️', done: true },
                { title: 'Info extracted', sub: 'Sets, reps, equipment logged', done: true },
                { title: 'Sorting into folder', sub: 'Almost done...', done: false },
              ].map((proc, i) => (
                <View key={i} style={[st.procItem, i < 3 && { marginBottom: 14 }]}>
                  <View style={[st.procDot, proc.done ? st.procDotDone : st.procDotPending]} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.procTitle}>{proc.title}</Text>
                    <Text style={st.procSub}>{proc.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={st.body}>
              <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>
                All of this while you're still on TikTok.
              </Text>
              {' '}You do not switch apps once.
            </Text>
            </View>
            <PrimaryBtn label="How do I know it's done?" onPress={next} />
          </View>
        );

      case 11:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>STEP 3 OF 3</Text>
            <Text style={st.headline}>
              We ping you{' '}
              <Text style={[st.headline, { color: colors.primary }]}>when it's ready.</Text>
            </Text>
            <Text style={st.body}>
              A notification lands while you're still scrolling. Tap it when you want. It's not
              going anywhere.
            </Text>
            {[
              {
                body: 'Your workout video is sorted into Fitness 💪. Sets, reps and equipment pulled out.',
                time: 'just now',
              },
              {
                body: 'Pasta Carbonara added to Recipes 🍳. Ingredients and steps ready.',
                time: '2 min ago',
              },
            ].map((n, i) => (
              <View key={i} style={st.notif}>
                <View style={st.notifIcon}>
                  <Image
                    source={require('@/assets/logo-transparent.png')}
                    style={{ width: 22, height: 22 }}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={st.notifTitleRow}>
                    <Text style={st.notifTitle}>
                      {'Reel'}
                      <Text style={{ color: colors.primary }}>{'Actions'}</Text>
                    </Text>
                    <Text style={st.notifTime}>{n.time}</Text>
                  </View>
                  <Text style={st.notifBody}>{n.body}</Text>
                </View>
              </View>
            ))}
            <Text style={st.body}>
              That ping is the moment your save becomes{' '}
              <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>
                something you'll actually use.
              </Text>
            </Text>
            </View>
            <PrimaryBtn label="What does it look like inside?" onPress={next} />
          </View>
        );

      case 12:
        return (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[st.scrollScreen, { justifyContent: 'center' }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 20 }}>
              <Text style={st.eyebrow}>INSIDE THE APP</Text>
              <Text style={st.headline}>
                Every video gets{' '}
                <Text style={[st.headline, { color: colors.primary }]}>unpacked.</Text>
              </Text>
              <Text style={st.body}>
                No rewatching. Key info pulled out so you can act immediately.
              </Text>
              {[
                {
                  title: '5-Minute Ab Workout',
                  points: ['Plank, crunches, leg raises', '5 mins · No equipment · Beginner'],
                },
                {
                  title: 'Pasta Carbonara',
                  points: ['Eggs, pecorino, guanciale, pasta', '20 mins · Serves 2'],
                },
              ].map((card, i) => (
                <View key={i} style={st.infoCard}>
                  <Text style={st.infoCardTitle}>{card.title}</Text>
                  {card.points.map((p, j) => (
                    <View key={j} style={st.infoRow}>
                      <View style={st.infoDot} />
                      <Text style={st.infoText}>{p}</Text>
                    </View>
                  ))}
                </View>
              ))}
              <Text style={st.body}>
                Everything you need to do the thing.{' '}
                <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>Right there.</Text>
              </Text>
            </View>
            <PrimaryBtn label="What about finding things later?" onPress={next} marginTop={32} />
          </ScrollView>
        );

      case 13:
        return (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[st.scrollScreen, { justifyContent: 'center' }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 20 }}>
              <Text style={st.eyebrow}>THE AI LAYER</Text>
              <Text style={st.headline}>
                Forgot you saved it?{' '}
                <Text style={[st.headline, { color: colors.primary }]}>Just ask.</Text>
              </Text>
              <Text style={st.body}>
                Search your entire library in plain English. Even if you don't remember what you
                saved.
              </Text>
              {[
                {
                  query: '"Show me that shoulder workout I saved"',
                  result: '3 videos matched · last 60 days',
                },
                {
                  query: '"Recipes I can make in under 20 minutes"',
                  result: '12 videos matched · quickest first',
                },
              ].map((s, i) => (
                <View key={i} style={st.infoCard}>
                  <Text style={st.searchQuery}>{s.query}</Text>
                  <View style={st.infoRow}>
                    <View style={st.infoDot} />
                    <Text style={st.infoText}>{s.result}</Text>
                  </View>
                </View>
              ))}
              <Text style={st.body}>
                Your library becomes something you can actually query.{' '}
                <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>Nothing lost.</Text>
              </Text>
            </View>
            <PrimaryBtn label="This is exactly what I need" onPress={next} marginTop={32} />
          </ScrollView>
        );

      // ────────────────────────────────────────
      // PHASE 5 — PLATFORMS + FEATURES
      // ────────────────────────────────────────

      case 14:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>PLATFORM SUPPORT</Text>
            <Text style={st.headline}>
              Works where{' '}
              <Text style={[st.headline, { color: colors.primary }]}>you already scroll.</Text>
            </Text>
            <View style={st.platformCard}>
              <View style={[st.platformBadge, { backgroundColor: '#111', borderColor: '#ffffff22' }]}>
                <TikTokLogo size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.platformName}>TikTok</Text>
                <Text style={st.platformDesc}>Share any video via the share sheet. Done.</Text>
              </View>
            </View>
            <View style={st.platformCard}>
              <View style={[st.platformBadge, { overflow: 'hidden', borderColor: '#ffffff22' }]}>
                <Svg width={48} height={48} viewBox="0 0 48 48" style={{ position: 'absolute' }}>
                  <Defs>
                    <LinearGradient id="igp" x1="0" y1="1" x2="1" y2="0">
                      <Stop offset="0" stopColor="#f09433" />
                      <Stop offset="0.5" stopColor="#dc2743" />
                      <Stop offset="1" stopColor="#bc1888" />
                    </LinearGradient>
                  </Defs>
                  <Rect width={48} height={48} fill="url(#igp)" />
                </Svg>
                <InstagramLogo size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.platformName}>Instagram</Text>
                <Text style={st.platformDesc}>Reels and posts. Share them the same way.</Text>
              </View>
            </View>
            </View>
            <PrimaryBtn label="Almost there" onPress={next} />
          </View>
        );

      case 15:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
              <View style={{ gap: 8 }}>
                <Text style={st.eyebrow}>WHAT CHANGES</Text>
                <Text style={st.headline}>
                  Your saves finally{' '}
                  <Text style={[st.headline, { color: colors.primary }]}>work for you.</Text>
                </Text>
              </View>
              <View style={{ gap: 12 }}>
                {(
                  [
                    {
                      icon: 'flash-outline' as const,
                      title: 'Curated Tasks',
                      body: 'We extract actionable steps from your saved reels automatically.',
                    },
                    {
                      icon: 'trending-up-outline' as const,
                      title: 'Momentum Tracking',
                      body: 'Visualize your discipline with streak tracking.',
                    },
                    {
                      icon: 'search-outline' as const,
                      title: 'AI Search',
                      body: 'Find any save instantly. Just describe it in plain English.',
                    },
                  ]
                ).map((f, i) => (
                  <View key={i} style={st.featureCard}>
                    <Ionicons name={f.icon} size={20} color={colors.primary} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={st.featureTitle}>{f.title}</Text>
                      <Text style={st.featureBody}>{f.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
            <PrimaryBtn label="Let's do this" onPress={next} />
          </View>
        );

      // ────────────────────────────────────────
      // PHASE 6 — COMMITMENT
      // ────────────────────────────────────────

      case 16:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
              <Text style={st.headline}>
                Do you save videos thinking you'll come back to them?
              </Text>
              <Text style={st.body}>
                Most people save hundreds of reels but only act on less than 1%. Let's change that
                pattern.
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={st.answerYes} onPress={next} activeOpacity={0.85}>
                <Text style={st.answerYesText}>Yes, all the time</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.answerNo} onPress={next} activeOpacity={0.85}>
                <Text style={st.answerNoText}>Not really</Text>
              </TouchableOpacity>
              <Text style={[st.footerCap, { marginTop: 4 }]}>
                {'REEL'}
                <Text style={{ color: colors.primary }}>{'ACTIONS'}</Text>
                {' EXPERIENCE'}
              </Text>
            </View>
          </View>
        );

      case 17:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <View style={{ gap: 6 }}>
              <Text style={st.eyebrow}>HABIT ASSESSMENT</Text>
              <Text style={st.headline}>How much of what you save do you apply?</Text>
              <Text style={st.body}>
                We want to help you shift from passive consumption to active habit building.
              </Text>
            </View>
            <PercentSlider value={q17Pick} onChange={(v) => { setQ17Pick(v); setQ17Touched(true); }} />
            <View style={st.infoCard}>
              <Text style={st.infoCardTitle}>Execution Ratio</Text>
              <View style={st.infoRow}>
                <View style={st.infoDot} />
                <Text style={st.infoText}>
                  The average user only acts on 20% of their saved content. A goal of 50%+ builds real
                  long-term discipline.
                </Text>
              </View>
            </View>
            </View>
            <PrimaryBtn label="Continue" onPress={next} disabled={!q17Touched} />
          </View>
        );

      // ────────────────────────────────────────
      // PHASE 7 — CONVICTION + CONVERT
      // ────────────────────────────────────────

      case 18:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
            <Text style={st.eyebrow}>YOU'RE READY</Text>
            <Text style={st.headline}>
              Ready to actually{' '}
              <Text style={[st.headline, { color: colors.primary }]}>use what you save?</Text>
            </Text>
            <Text style={st.body}>
              You share the videos.{' '}
              <Text style={[st.body, { color: 'rgba(255,255,255,0.7)' }]}>
                We handle the rest.
              </Text>
            </Text>
            </View>
            <PrimaryBtn label="I'm ready" onPress={finish} />
          </View>
        );

      case 19:
        return (
          <View style={st.screen}>
            <View style={st.screenBody}>
              <Image
                source={require('@/assets/logo-transparent.png')}
                style={{ width: 64, height: 64, alignSelf: 'center' }}
                resizeMode="contain"
              />
              <View style={{ gap: 8 }}>
                <Text style={st.eyebrow}>CREATE YOUR ACCOUNT</Text>
                <Text style={st.headline}>
                  Takes{' '}
                  <Text style={[st.headline, { color: colors.primary }]}>30 seconds.</Text>
                </Text>
                <Text style={st.body}>
                  Just your email. You'll connect TikTok and Instagram inside the app.
                </Text>
              </View>
              <View style={st.infoCard}>
                {[
                  'No spam. Free to start.',
                  'Sign in with Apple, Google, or email.',
                  'Free for 2 weeks. Cancel anytime.',
                ].map((line, i) => (
                  <View key={i} style={[st.infoRow, i > 0 && { marginTop: 8 }]}>
                    <View style={st.infoDot} />
                    <Text style={st.infoText}>{line}</Text>
                  </View>
                ))}
              </View>
            </View>
            <PrimaryBtn label="Create My Account" onPress={next} />
          </View>
        );

      case 20:
        return (
          <View style={[st.screen, { justifyContent: 'center', alignItems: 'center' }]}>
            <Image
              source={require('@/assets/logo-transparent.png')}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
            />
            <Text style={[st.eyebrow, { textAlign: 'center' }]}>YOU'RE IN</Text>
            <Text style={[st.headline, { textAlign: 'center' }]}>
              No more{' '}
              <Text style={[st.headline, { color: colors.primary }]}>lost videos.</Text>
            </Text>
            <Text style={[st.body, { textAlign: 'center' }]}>
              Connect your account, share your first video, and watch the notification land.
            </Text>
            <PrimaryBtn label="Let's Go" onPress={finish} />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={st.container}>
      <View style={[st.topProgressWrap, { opacity: step === 0 ? 0 : 1 }]}>
        <View
          style={[
            st.topProgressFill,
            { width: `${Math.round((step / TOTAL) * 100)}%` as any },
          ]}
        />
      </View>
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ──

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Global top progress bar
  topProgressWrap: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  topProgressFill: {
    height: 2,
    backgroundColor: colors.primary,
  },

  // Screen containers
  screen: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 28,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  screenBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  scrollScreen: {
    flexGrow: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 20,
  },

  // Typography
  eyebrow: {
    fontSize: 10,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: `${colors.primary}AA`,
    letterSpacing: 1.2,
  },
  introLabel: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 26,
    fontFamily: 'HankenGrotesk_700Bold',
    color: '#e8f0e8',
    lineHeight: 33,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 14,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 22,
  },
  rule: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // Big stat blocks (screen 3)
  bigStatBlock: { gap: 4 },
  bigNum: {
    fontSize: 52,
    fontFamily: 'HankenGrotesk_700Bold',
    lineHeight: 56,
    letterSpacing: -1.5,
  },
  bigSub: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.38)',
    lineHeight: 20,
    maxWidth: 260,
  },

  // Buttons
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: colors.onPrimary,
    letterSpacing: -0.2,
  },
  ghostBtn: { paddingVertical: 13, alignItems: 'center' },
  ghostBtnText: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },

  // Choice lists (screens 1, 2, 5)
  choiceList: { gap: 10 },
  iconChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: radii.xxl,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  iconChoiceSel: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  iconChoiceBadge: {
    width: 50,
    height: 50,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceBadgeSel: {
    backgroundColor: `${colors.primary}15`,
    borderColor: `${colors.primary}40`,
  },
  iconChoiceLabel: {
    fontSize: 15,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.55)',
  },
  iconChoiceLabelSel: {
    color: '#fff',
  },
  iconChoiceSub: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.28)',
  },
  iconChoiceCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choice: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  choiceSel: {
    borderColor: `${colors.primary}80`,
    backgroundColor: `${colors.primary}0A`,
  },
  choiceText: {
    fontSize: 14,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  choiceTextSel: { color: 'rgba(255,255,255,0.9)' },

  // Bar chart (screen 4)
  liveBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    alignItems: 'center',
  },
  liveNum: {
    fontSize: 52,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: '#ffffff',
    letterSpacing: -2,
    lineHeight: 56,
  },
  liveLabel: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statRowCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  statRowDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  statRowNum: {
    fontSize: 30,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    letterSpacing: -1,
    lineHeight: 34,
  },
  statRowLabel: {
    fontSize: 10,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
  barBlock: { gap: 12 },
  barItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
    width: 100,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barNum: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
    width: 32,
    textAlign: 'right',
  },

  // Dark cards (screens 6, 7, 10, 14, 17, 18)
  dcard: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  dcardTitle: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  dcardSub: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
  },

  // Pill badge (screen 8)
  pillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}0F`,
    borderWidth: 0.5,
    borderColor: `${colors.primary}2E`,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: `${colors.primary}CC`,
    letterSpacing: 0.4,
  },

  // 2×2 stat grid (screen 8)
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCell: {
    width: '47.5%',
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.lg,
    padding: 14,
  },
  statNum: {
    fontSize: 22,
    fontFamily: 'HankenGrotesk_700Bold',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 18,
  },

  // Share sheet mockup (screen 9)
  shareSheet: {
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  shareHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  shareTitle: {
    fontSize: 15,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareAppsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareApp: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  shareIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareAppName: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  // Processing steps (screen 10)
  procItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  procDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  procDotDone: { backgroundColor: colors.primary },
  procDotPending: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: `${colors.primary}60`,
  },
  procTitle: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  procSub: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },

  // Notification mockups (screen 11)
  notif: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 0.5,
    borderColor: `${colors.primary}2E`,
    borderRadius: radii.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 0.5,
    borderColor: `${colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.85)',
  },
  notifTime: {
    fontSize: 10,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.25)',
  },
  notifBody: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },

  // Info extraction / AI search cards (screens 12, 13, 17)
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  infoCardTitle: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: `${colors.primary}99`,
    marginTop: 7,
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 18,
  },
  searchQuery: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
    marginBottom: 8,
  },

  // Platform cards (screen 14)
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  platformBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  platformInitial: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  platformName: {
    fontSize: 14,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  platformDesc: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 18,
  },

  // Feature cards (screen 15)
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: radii.lg,
    padding: spacing.cardInner,
  },
  featureIcon: { fontSize: 18, marginTop: 1 },
  featureTitle: {
    fontSize: 14,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.85)',
  },
  featureBody: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 19,
  },

  // Q1 answer buttons (screen 16)
  answerYes: {
    paddingVertical: 17,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    alignItems: 'center',
  },
  answerYesText: {
    fontSize: 15,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: colors.onPrimary,
  },
  answerNo: {
    paddingVertical: 17,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radii.xl,
    alignItems: 'center',
  },
  answerNoText: {
    fontSize: 15,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
  },
  footerCap: {
    fontSize: 10,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  // Percent slider (screen 17)
  sliderContainer: {
    height: 64,
    position: 'relative',
  },
  sliderBubble: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_700Bold',
    color: colors.primary,
    textAlign: 'center',
  },
  sliderBigVal: {
    fontSize: 52,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 60,
  },
  sliderBigThumb: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sliderEndLabel: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },
  pillThumbVal: {
    fontSize: 16,
    fontFamily: 'HankenGrotesk_700Bold',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  sliderRowLabel: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sliderTick: {
    position: 'absolute',
    top: -9,
    width: 1.5,
    height: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  sliderTickLabel: {
    position: 'absolute',
    top: 10,
    width: 24,
    fontSize: 10,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_W,
    height: THUMB_W,
    borderRadius: THUMB_R,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  sliderThumbDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.onPrimary,
  },

  // Step header (screens 16, 17)
  stepHeader: { gap: 6 },
  stepHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepLabel: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
  },
  stepPct: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: colors.primary,
  },
  stepTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

  // Intro screen (case 0)
  introHeroLogo: {
    fontSize: 64,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: '#e8f0e8',
    letterSpacing: -2.5,
    lineHeight: 68,
  },
  introTagline: {
    fontSize: 16,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 24,
  },
  introSupporting: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
  },
  introSignIn: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_500Medium',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },

  // Pre-signup / welcome hero (screens 19, 20)
  heroStar: {
    fontSize: 52,
    color: colors.primary,
    textAlign: 'center',
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
});
