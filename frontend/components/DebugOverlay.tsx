import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import { useAppState } from '@/contexts/AppStateContext';

export function DebugOverlay() {
  const { session, signOut } = useAuth();
  const { isSubscribed, packages } = usePurchases();
  const { status } = useAppState();

  const userId = session?.user?.id?.slice(0, 8) ?? 'none';

  const reset = async () => {
    try { await signOut(); } catch {}
    try { await AsyncStorage.removeItem('onboarding_complete'); } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>
          {status} · sess:{session ? '✓' : '✗'} · sub:{isSubscribed ? '✓' : '✗'} · pkgs:{packages.length} · uid:{userId}
        </Text>
      </View>
      <TouchableOpacity style={styles.resetBtn} onPress={reset}>
        <Text style={styles.resetText}>RESET</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    gap: 4,
  },
  pill: {
    backgroundColor: 'rgba(255, 200, 0, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  text: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 9,
    color: '#000',
  },
  resetBtn: {
    backgroundColor: 'rgba(220, 50, 50, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  resetText: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 9,
    color: '#fff',
  },
});
