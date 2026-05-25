import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radii } from '@/constants/theme';

export default function Insight2Screen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.brandText}>Reel<Text style={styles.brandGreen}>Actions</Text></Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>THE REALITY</Text>
        <Text style={styles.primaryStat}>The average person saves 47 videos a week.</Text>
        <Text style={styles.secondaryStat}>They revisit only 2.</Text>
        <Text style={styles.valueProp}>
          ReelActions turns your bookmarks into habits. Stop collecting, start acting.
        </Text>
        <Text style={styles.breakline}>Break the cycle</Text>
      </View>

      <View style={styles.footer}>
        <Button label="Next →" onPress={() => router.push('/(onboarding)/insight-3')} />
        <Button label="Skip for now" variant="ghost" onPress={() => router.push('/(auth)/sign-up')} />
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
    paddingTop: spacing.stackGap,
    gap: 12,
    justifyContent: 'center',
  },
  sectionLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  primaryStat: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  secondaryStat: {
    ...typography.headlineMd,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  valueProp: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  breakline: {
    ...typography.titleLg,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.elementTight,
  },
});
