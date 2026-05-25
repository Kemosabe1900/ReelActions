import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radii } from '@/constants/theme';

export default function Insight1Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.brandText}>Reel<Text style={styles.brandGreen}>Actions</Text></Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.stat}>93%</Text>
        <Text style={styles.statSub}>of your saves are collecting dust</Text>

        <Text style={styles.body}>
          Information without action is just noise. Most users never look back at their saved content.
        </Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>CURRENT STATUS</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>247</Text>
              <Text style={styles.statusMeta}>Unfinished Reels</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>12h 40m</Text>
              <Text style={styles.statusMeta}>Est. Time</Text>
            </View>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>247</Text>
              <Text style={styles.statusMeta}>Content Pieces</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>18</Text>
              <Text style={styles.statusMeta}>Completed</Text>
            </View>
          </View>
        </View>

        <Text style={styles.tagline}>Turn scrolling into skill building.</Text>
      </View>

      <View style={styles.footer}>
        <Button label="Let's Change That →" onPress={() => router.push('/(onboarding)/insight-2')} />
        <Button label="Maybe later" variant="ghost" onPress={() => router.push('/(auth)/sign-up')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  brand: {
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'center',
    gap: spacing.stackGap,
  },
  stat: {
    fontSize: 80,
    fontWeight: '800',
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: colors.primary,
    lineHeight: 88,
  },
  statSub: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
    marginTop: -8,
  },
  body: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  statusLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  statusGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    gap: 2,
  },
  statusDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: 12,
  },
  statusValue: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  statusMeta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  tagline: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.elementTight,
  },
});
