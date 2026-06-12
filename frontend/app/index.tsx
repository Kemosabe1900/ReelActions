import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { DEV_MODE } from '@/constants/config';
import { colors } from '@/constants/theme';

// Set true to reset onboarding on every launch (flow testing)
const RESET_ONBOARDING = false;

export default function Index() {
  const { session, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (RESET_ONBOARDING) {
        await AsyncStorage.removeItem('onboarding_complete');
        setOnboardingDone(false);
        setChecking(false);
        return;
      }
      const val = await AsyncStorage.getItem('onboarding_complete');
      setOnboardingDone(val === 'true');
      setChecking(false);
    };
    check();
  }, []);

  if (loading || checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (DEV_MODE || session) {
    return <Redirect href="/(tabs)" />;
  }

  if (onboardingDone) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(onboarding)" />;
}
