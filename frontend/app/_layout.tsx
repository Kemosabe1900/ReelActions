import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
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

// expo-router renders this on any uncaught render error in the route tree,
// instead of a frozen white screen.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => {
    Sentry.captureException(error);
    SplashScreen.hideAsync().catch(() => {});
  }, [error]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
        Something went wrong
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 14, textAlign: 'center' }}>
        The app hit an unexpected error. Tap below to reload.
      </Text>
      <TouchableOpacity
        onPress={() => retry()}
        style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 12 }}
      >
        <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Reload</Text>
      </TouchableOpacity>
    </View>
  );
}

function PushRegistrar() {
  const { session } = useAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current !== uid) {
      registeredFor.current = uid;
      registerForPushNotifications();
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) api.profile.setTimezone(tz).catch(() => {});
      } catch {}
    }
  }, [session]);

  return null;
}

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { addPendingJob, addFailedSave } = useData();

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = shareIntent.webUrl ?? shareIntent.text ?? '';
    if (!url.trim()) { resetShareIntent(); return; }
    const trimmed = url.trim();
    api.videos.submit(trimmed)
      .then(res => addPendingJob(res.job_id, res.video_id, trimmed))
      .catch((e: any) => addFailedSave(trimmed, e.message || 'Something went wrong. Please try again.'))
      .finally(() => resetShareIntent());
  }, [hasShareIntent]);

  return null;
}

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Navigates to the video a "Save ready!" push points at. Waits for
// AUTHENTICATED so the push lands after StateGuard settles the root route.
function NotificationNavigator() {
  const { status } = useAppState();
  const router = useRouter();
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (IS_EXPO_GO) return;
    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      const extractId = (res: unknown) => {
        const id = (res as any)?.notification?.request?.content?.data?.video_id;
        if (id) setVideoId(String(id));
      };
      const sub = Notifications.addNotificationResponseReceivedListener(extractId);
      Notifications.getLastNotificationResponseAsync().then(extractId).catch(() => {});
      return () => sub.remove();
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!videoId || status !== 'AUTHENTICATED') return;
    router.push(`/video/${videoId}` as never);
    setVideoId(null);
  }, [videoId, status]);

  return null;
}

const ALLOWED_BY_STATUS: Record<Exclude<AppStatus, 'HYDRATING'>, (segments: string[]) => boolean> = {
  NEEDS_ONBOARDING: (segs) =>
    segs.includes('(onboarding)') || segs.includes('(auth)') || segs.includes('sign-in'),
  NEEDS_REAUTH: (segs) =>
    segs.includes('(auth)') || segs.includes('sign-in'),
  NEEDS_SUBSCRIPTION: (segs) =>
    segs.includes('subscription') || segs.includes('(auth)') || segs.includes('sign-in') || segs.includes('sign-up'),
  NEEDS_REGISTRATION: (segs) =>
    segs.includes('(auth)') || segs.includes('sign-in') || segs.includes('sign-up'),
  AUTHENTICATED: (segs) =>
    segs.includes('(tabs)') || segs.includes('chat') || segs.includes('category') || segs.includes('video'),
};

const HOME_FOR_STATUS: Record<Exclude<AppStatus, 'HYDRATING'>, string> = {
  NEEDS_ONBOARDING: '/(onboarding)',
  NEEDS_REAUTH: '/(auth)/sign-in',
  NEEDS_SUBSCRIPTION: '/subscription',
  NEEDS_REGISTRATION: '/(auth)/sign-up',
  AUTHENTICATED: '/(tabs)',
};

function StateGuard() {
  const { status } = useAppState();
  const segments = useSegments();
  const router = useRouter();
  const splashHidden = useRef(false);

  useEffect(() => {
    if (status === 'HYDRATING') return;
    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
    if (ALLOWED_BY_STATUS[status](segments as string[])) return;
    router.replace(HOME_FOR_STATUS[status] as never);
  }, [status, segments]);

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
            <NotificationNavigator />
            <StatusBar style="light" />
            {DEBUG_OVERLAY && <DebugOverlay />}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="subscription" options={{ headerShown: false }} />
              <Stack.Screen name="category/[name]" />
              <Stack.Screen name="video/[id]" />
            </Stack>
          </ShareIntentProvider>
        </AppProviders>
      </AuthProvider>
    </PostHogProvider>
  );
}
