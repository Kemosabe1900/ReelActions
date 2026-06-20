import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { usePurchases } from '@/contexts/PurchasesContext';
import { colors, spacing, radii } from '@/constants/theme';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

const PLANS = [
  {
    id: 'annual',
    label: 'Annual Plan',
    billedAmount: '$89.99/yr',
    weeklyEquiv: '$1.73/wk',
    badge: 'Save 42%',
  },
  {
    id: 'monthly',
    label: 'Monthly Plan',
    billedAmount: '$12.99/mo',
    weeklyEquiv: '$3.00/wk',
    badge: 'Most Popular',
  },
  {
    id: 'weekly',
    label: 'Weekly Plan',
    billedAmount: '$4.99/wk',
    weeklyEquiv: null,
    badge: null,
  },
] as const;

export default function SubscriptionScreen() {
  const { packages, purchase, restore } = usePurchases();
  const [selectedId, setSelectedId] = useState<'annual' | 'monthly' | 'weekly'>('annual');
  const [purchasing, setPurchasing] = useState(false);

  const annualPkg = packages.find(p => p.packageType === 'ANNUAL');
  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY');
  const weeklyPkg = packages.find(p => p.packageType === 'WEEKLY');

  async function handlePurchase() {
    if (IS_EXPO_GO) { router.push('/(auth)/sign-up'); return; }
    const pkg = selectedId === 'annual' ? annualPkg : selectedId === 'monthly' ? monthlyPkg : weeklyPkg;
    if (!pkg) return;
    setPurchasing(true);
    try {
      await purchase(pkg);
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      const active = await restore();
      if (!active) {
        Alert.alert('No purchase found', 'We could not find an existing subscription for this account.');
      }
    } catch {
      Alert.alert('No purchase found', 'We could not find an existing subscription for this account.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={handleRestore} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.restoreText}>Restore</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <Image
            source={require('@/assets/logo-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headline}>
            Turn saves into{'\n'}
            <Text style={{ color: colors.primary }}>action.</Text>
          </Text>
          <Text style={styles.subhead}>
            You share the videos. We handle the rest.
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansSection}>
          {PLANS.map((plan) => {
            const active = selectedId === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planRow, active && styles.planRowActive]}
                onPress={() => setSelectedId(plan.id as 'annual' | 'monthly' | 'weekly')}
                activeOpacity={0.8}
              >
                <View style={styles.planLeft}>
                  <Text style={[styles.planLabel, active && styles.planLabelActive]}>
                    {plan.label}
                  </Text>
                  {plan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.planPriceCol}>
                  <Text style={[styles.planBilledAmount, active && styles.planBilledAmountActive]}>
                    {plan.billedAmount}
                  </Text>
                  {plan.weeklyEquiv && (
                    <Text style={styles.planWeeklyEquiv}>{plan.weeklyEquiv}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={[styles.cta, purchasing && { opacity: 0.6 }]}
            onPress={handlePurchase}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>
              {purchasing ? 'Processing…' : 'Start 14-day free trial'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.trustLine}>Cancel anytime  ·  No charges for 14 days</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.signInLink}>Already have an account? <Text style={{ color: colors.primary, fontFamily: 'HankenGrotesk_700Bold' }}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerSep}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://getreelactions.com/privacy')}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 8,
    paddingBottom: 4,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.4)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
  },
  logo: {
    width: 72,
    height: 72,
  },
  headline: {
    fontSize: 36,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 42,
  },
  subhead: {
    fontSize: 14,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  plansSection: {
    gap: 10,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.full,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  planRowActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: 'HankenGrotesk_700Bold',
    color: colors.onPrimary,
  },
  planLabel: {
    fontSize: 15,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
  },
  planLabelActive: {
    color: colors.onSurface,
  },
  planPriceCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  planBilledAmount: {
    fontSize: 15,
    fontFamily: 'HankenGrotesk_700Bold',
    color: 'rgba(255,255,255,0.5)',
  },
  planBilledAmountActive: {
    color: colors.onSurface,
  },
  planWeeklyEquiv: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },
  ctaSection: {
    gap: 12,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    height: 54,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 16,
  },
  trustLine: {
    fontSize: 12,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },
  signInLink: {
    marginTop: 14,
    fontSize: 13,
    fontFamily: 'HankenGrotesk_500Medium',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontSize: 11,
    fontFamily: 'HankenGrotesk_400Regular',
    color: 'rgba(255,255,255,0.25)',
    textDecorationLine: 'underline',
  },
  footerSep: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
  },
});
