import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { useShareIntentContext, ShareIntentProvider } from 'expo-share-intent';
import { colors } from '@/constants/theme';
import { api } from '@/services/api';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { PurchasesProvider } from '@/contexts/PurchasesContext';
import { DataProvider, useData } from '@/contexts/DataContext';
import { AppStateProvider, useAppState, AppStatus } from '@/contexts/AppStateContext';
import { registerForPushNotifications } from '@/services/notifications';
import { DEV_MODE, SENTRY_DSN, POSTHOG_API_KEY, DEBUG_OVERLAY } from '@/constants/config';
import { DebugOverlay } from '@/components/DebugOverlay';
import { PostHogProvider } from 'posthog-react-native';
import * as Sentry from '@sentry/react-native';

if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.1 });
}

SplashScreen.preventAutoHideAsync();

function PushRegistrar() {
  const { session } = useAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    const uid = session?.user?.id;
    if (uid && registeredFor.current !== uid) {
      registeredFor.current = uid;
      registerForPushNotifications();
    }
  }, [session]);

  return null;
}

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { addPendingJob } = useData();

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = shareIntent.webUrl ?? shareIntent.text ?? '';
    if (!url.trim()) { resetShareIntent(); return; }
    const trimmed = url.trim();
    api.videos.submit(trimmed)
      .then(res => addPendingJob(res.job_id, res.video_id, trimmed))
      .catch(() => {})
      .finally(() => resetShareIntent());
  }, [hasShareIntent]);

  return null;
}

const ALLOWED_BY_STATUS: Record<Exclude<AppStatus, 'HYDRATING'>, (segments: string[]) => boolean> = {
  NEEDS_ONBOARDING: (segs) => segs.includes('(onboarding)'),
  NEEDS_SUBSCRIPTION: (segs) =>
    segs.includes('subscription') || segs.includes('backup-offer') || segs.includes('(auth)') || segs.includes('sign-in') || segs.includes('sign-up'),
  NEEDS_REGISTRATION: (segs) =>
    segs.includes('(auth)') || segs.includes('sign-in') || segs.includes('sign-up'),
  AUTHENTICATED: (segs) =>
    segs.includes('(tabs)') || segs.includes('chat') || segs.includes('category') || segs.includes('video'),
};

const HOME_FOR_STATUS: Record<Exclude<AppStatus, 'HYDRATING'>, string> = {
  NEEDS_ONBOARDING: '/(onboarding)',
  NEEDS_SUBSCRIPTION: '/subscription',
  NEEDS_REGISTRATION: '/(auth)/sign-up',
  AUTHENTICATED: '/(tabs)',
};

function StateGuard() {
  const { status } = useAppState();
  const router = useRouter();
  const splashHidden = useRef(false);

  useEffect(() => {
    if (status === 'HYDRATING') return;
    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
    router.replace(HOME_FOR_STATUS[status] as never);
  }, [status]);

  return null;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = DEV_MODE ? 'a72e67a7-b3b8-4890-9c52-61a7be63639e' : session?.user?.id;
  return (
    <PurchasesProvider userId={userId}>
      <DataProvider>
        <AppStateProvider>
          {children}
        </AppStateProvider>
      </DataProvider>
    </PurchasesProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <PostHogProvider apiKey={POSTHOG_API_KEY} options={{ host: 'https://us.i.posthog.com' }} disabled={!POSTHOG_API_KEY}>
      <AuthProvider>
        <AppProviders>
          <ShareIntentProvider>
            <PushRegistrar />
            <ShareIntentHandler />
            <StateGuard />
            <StatusBar style="light" />
            {DEBUG_OVERLAY && <DebugOverlay />}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="subscription" options={{ headerShown: false }} />
              <Stack.Screen name="backup-offer" options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="chat" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
              <Stack.Screen name="category/[name]" />
              <Stack.Screen name="video/[id]" />
            </Stack>
          </ShareIntentProvider>
        </AppProviders>
      </AuthProvider>
    </PostHogProvider>
  );
}
