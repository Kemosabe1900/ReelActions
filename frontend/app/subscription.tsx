import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { usePurchases } from '@/contexts/PurchasesContext';
import { colors, typography, spacing, radii } from '@/constants/theme';

const PLANS = [
  {
    id: 'annual',
    label: 'Annual',
    badge: 'Best Value',
    price: '$7.49 / month',
    sub: 'billed annually',
    total: '$89.99 / year',
    recommended: true,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    badge: null,
    price: '$12.99',
    sub: 'per month',
    total: null,
    recommended: false,
  },
];

export default function SubscriptionScreen() {
  const { packages, purchase, restore } = usePurchases();
  const [selectedId, setSelectedId] = useState<'annual' | 'monthly'>('annual');
  const [purchasing, setPurchasing] = useState(false);

  const annualPkg = packages.find(p => p.packageType === 'ANNUAL');
  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY');

  async function handlePurchase() {
    const pkg = selectedId === 'annual' ? annualPkg : monthlyPkg;
    if (!pkg) return;
    setPurchasing(true);
    try {
      await purchase(pkg);
      router.back();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      await restore();
      Alert.alert('Restored', 'Your purchase has been restored.');
      router.back();
    } catch {
      Alert.alert('Restore failed', 'No previous purchase found.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>ReelActions — Turn Saves Into Action</Text>

        <View style={styles.heroImage}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.heroEmoji}>💪</Text>
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.headline}>Turn saves into action</Text>
          <Text style={styles.body}>
            Stop doomscrolling. Start achieving. Unlock the full suite of habit-building tools.
          </Text>
        </View>

        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureLabel}>Full Analytics</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏆</Text>
            <Text style={styles.featureLabel}>Milestones</Text>
          </View>
        </View>

        <View style={styles.plansRow}>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, selectedId === plan.id && styles.planCardActive]}
              activeOpacity={0.8}
              onPress={() => setSelectedId(plan.id as 'annual' | 'monthly')}
            >
              {plan.badge && (
                <View style={styles.badgeChip}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}
              <Text style={styles.planLabel}>{plan.label}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planSub}>{plan.sub}</Text>
              {plan.total && <Text style={styles.planTotal}>{plan.total}</Text>}
              <Text style={styles.cancelAny}>Cancel anytime</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          label={purchasing ? 'Processing…' : 'Try Free for 7 Days'}
          onPress={handlePurchase}
          disabled={purchasing}
        />
        <Text style={styles.trialLegal}>
          After 7 days, you will be charged $89.99 annually. No commitment, cancel anytime.
        </Text>

        <View style={styles.footerLinks}>
          <TouchableOpacity><Text style={styles.footerLink}>Terms of Service</Text></TouchableOpacity>
          <Text style={styles.footerSep}>|</Text>
          <TouchableOpacity><Text style={styles.footerLink}>Privacy Policy</Text></TouchableOpacity>
          <Text style={styles.footerSep}>|</Text>
          <TouchableOpacity onPress={handleRestore}><Text style={styles.footerLink}>Restore Purchase</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    paddingBottom: 40,
    gap: spacing.stackGap,
  },
  headerTitle: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
    textAlign: 'center',
  },
  heroImage: {
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  heroEmoji: {
    fontSize: 72,
  },
  valueSection: {
    gap: 8,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  body: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: spacing.stackGap,
  },
  featureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.cardInner,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureLabel: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  plansRow: {
    flexDirection: 'row',
    gap: spacing.elementTight,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHigh,
  },
  badgeChip: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  badgeText: {
    ...typography.labelCaps,
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  planLabel: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  planPrice: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
    textAlign: 'center',
  },
  planSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
  },
  planTotal: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
    textAlign: 'center',
  },
  cancelAny: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  trialLegal: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  footerLink: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textDecorationLine: 'underline',
  },
  footerSep: {
    ...typography.bodySm,
    color: colors.outline,
  },
});
