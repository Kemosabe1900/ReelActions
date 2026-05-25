import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radii } from '@/constants/theme';

export default function Question1Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandText}>Reel<Text style={styles.brandGreen}>Actions</Text> 👋</Text>
        <View style={styles.fireBadge}>
          <Text style={styles.fireText}>🔥 7</Text>
        </View>
      </View>

      <View style={styles.progress}>
        <Text style={styles.progressText}>Step 01 / 04 — 25% complete</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '25%' }]} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.question}>Do you save videos thinking you'll come back to them?</Text>
        <Text style={styles.body}>
          Most people save hundreds of reels but only act on less than 1%. Let's change that pattern.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.answerButton}
          onPress={() => router.push('/(onboarding)/question-2')}
          activeOpacity={0.8}
        >
          <Text style={styles.answerText}>Yes, all the time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.answerButton, styles.answerButtonOutline]}
          onPress={() => router.push('/(onboarding)/question-2')}
          activeOpacity={0.8}
        >
          <Text style={[styles.answerText, styles.answerTextOutline]}>Not really</Text>
        </TouchableOpacity>
        <Text style={styles.footerLabel}>ReelActions Experience</Text>
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
  fireBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  fireText: {
    ...typography.bodySm,
    color: colors.secondary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  progress: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    gap: 8,
  },
  progressText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.outlineVariant,
    borderRadius: radii.full,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    gap: spacing.elementTight,
  },
  question: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  body: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.elementTight,
  },
  answerButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.cardInner,
    alignItems: 'center',
  },
  answerButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  answerText: {
    ...typography.titleLg,
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  answerTextOutline: {
    color: colors.onSurface,
  },
  footerLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
    textAlign: 'center',
    marginTop: 4,
  },
});
