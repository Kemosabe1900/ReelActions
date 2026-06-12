import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePurchases } from '@/contexts/PurchasesContext';
import { spacing, radii } from '@/constants/theme';
import { useState, useRef, useEffect } from 'react';

const YELLOW = '#f5c842';
const SHEET_BG = '#1c1a12';

export default function BackupOfferScreen() {
  const { packages, purchase } = usePurchases();
  const [purchasing, setPurchasing] = useState(false);
  const insets = useSafeAreaInsets();

  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY');
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, []);

  async function handleClaim() {
    if (!monthlyPkg) return;
    setPurchasing(true);
    try {
      await purchase(monthlyPkg);
      router.replace('/(auth)/sign-up');
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => router.back()}
      />

      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 24, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        <View style={styles.content}>
          <Text style={styles.eyebrow}>LIMITED TIME OFFER</Text>
          <Text style={styles.headline}>
            3 months for{' '}
            <Text style={{ color: YELLOW }}>$3.99.</Text>
          </Text>

          {/* Strikethrough pricing row */}
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$12.99/mo</Text>
            <Text style={styles.offerPrice}>$3.99</Text>
            <Text style={styles.perPeriod}> / mo for 3 months</Text>
          </View>

          <Text style={styles.note}>
            Includes 14-day free trial. Cancel anytime before renewal.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cta, purchasing && { opacity: 0.6 }]}
              onPress={handleClaim}
              disabled={purchasing}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>
                {purchasing ? 'Processing…' : 'Redeem Offer'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.skipText}>No thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(245,200,66,0.15)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(245,200,66,0.25)',
    alignSelf: 'center',
    marginBottom: 28,
  },
  content: {
    paddingHorizontal: spacing.containerPadding,
    gap: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: 'HankenGrotesk_700Bold',
    color: YELLOW,
    letterSpacing: 1.5,
    opacity: 0.7,
  },
  headline: {
    fontSize: 32,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: '#ffffff',
    lineHeight: 38,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 20,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.25)',
    textDecorationLine: 'line-through',
  },
  offerPrice: {
    fontSize: 28,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: YELLOW,
  },
  perPeriod: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.4)',
  },
  note: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 18,
  },
  actions: {
    gap: 14,
    alignItems: 'center',
    marginTop: 4,
    paddingBottom: 4,
  },
  cta: {
    width: '100%',
    height: 54,
    backgroundColor: YELLOW,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#1a1600',
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 16,
  },
  skipText: {
    fontSize: 13,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.2)',
    textDecorationLine: 'underline',
  },
});
