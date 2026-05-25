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
import { useShareIntentContext, ShareIntentProvider } from 'expo-share-intent';
import { colors } from '@/constants/theme';
import { api } from '@/services/api';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { PurchasesProvider } from '@/contexts/PurchasesContext';
import { registerForPushNotifications } from '@/services/notifications';
import { DEV_MODE } from '@/constants/config';

SplashScreen.preventAutoHideAsync();

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = shareIntent.webUrl ?? shareIntent.text ?? '';
    if (!url.trim()) { resetShareIntent(); return; }
    api.videos.submit(url.trim())
      .catch(() => {})
      .finally(() => resetShareIntent());
  }, [hasShareIntent]);

  return null;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = DEV_MODE ? 'a72e67a7-b3b8-4890-9c52-61a7be63639e' : session?.user?.id;
  return <PurchasesProvider userId={userId}>{children}</PurchasesProvider>;
}

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
      registerForPushNotifications();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
    <AppProviders>
    <ShareIntentProvider>
      <ShareIntentHandler />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="category/[name]" />
        <Stack.Screen name="video/[id]" />
      </Stack>
    </ShareIntentProvider>
    </AppProviders>
    </AuthProvider>
  );
}
