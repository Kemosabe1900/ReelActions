import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radii } from '@/constants/theme';

export default function Insight3Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandText}>Reel<Text style={styles.brandGreen}>Actions</Text></Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>STEP 3 OF 5</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.headline}>The format is broken.{'\n'}Not you.</Text>
        <View style={styles.separator} />
        <Text style={styles.body}>
          Stop fighting against endless scrolling. We turn digital consumption into actionable discipline.
        </Text>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureIconText}>📊</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureName}>Data-Driven Habit Tracking</Text>
            <Text style={styles.featureClaim}>Proven 82% increase in retention vs passive watching.</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Start Your Performance Journey"
          onPress={() => router.push('/(onboarding)/question-1')}
        />
        <Text style={styles.socialProof}>JOIN 12,000+ HIGH-INTENT USERS</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
  },
  brandText: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  brandGreen: {
    color: colors.primary,
  },
  stepBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  stepText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'center',
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  separator: {
    height: 2,
    backgroundColor: colors.primary,
    width: 48,
  },
  body: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginTop: 8,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    fontSize: 22,
  },
  featureContent: {
    flex: 1,
    gap: 4,
  },
  featureName: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  featureClaim: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: 12,
    alignItems: 'center',
  },
  socialProof: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
    textAlign: 'center',
  },
});
