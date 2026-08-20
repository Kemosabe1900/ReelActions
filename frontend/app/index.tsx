import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAppState } from '@/contexts/AppStateContext';
import { colors } from '@/constants/theme';

export default function Index() {
  const { status } = useAppState();

  if (status === 'HYDRATING') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  switch (status) {
    case 'NEEDS_ONBOARDING':
      return <Redirect href="/(onboarding)" />;
    case 'NEEDS_REAUTH':
      return <Redirect href="/(auth)/sign-in" />;
    case 'NEEDS_SUBSCRIPTION':
      return <Redirect href="/subscription" />;
    case 'NEEDS_REGISTRATION':
      return <Redirect href="/(auth)/sign-up" />;
    case 'AUTHENTICATED':
      return <Redirect href="/(tabs)" />;
  }
}
