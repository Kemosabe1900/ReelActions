import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { DEV_MODE } from '@/constants/config';
import { colors } from '@/constants/theme';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (DEV_MODE || session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-up" />;
}
