import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useAppState } from '@/contexts/AppStateContext';
import { colors } from '@/constants/theme';

export default function NotFound() {
  const { status } = useAppState();

  useEffect(() => {
    if (status === 'AUTHENTICATED') {
      router.replace('/(tabs)');
    } else if (status === 'NEEDS_SUBSCRIPTION') {
      router.replace('/subscription');
    } else if (status === 'NEEDS_ONBOARDING') {
      router.replace('/(onboarding)');
    } else if (status === 'NEEDS_REGISTRATION') {
      router.replace('/(auth)/sign-up');
    }
  }, [status]);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
