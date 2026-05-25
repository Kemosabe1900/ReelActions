import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing } from '@/constants/theme';

export default function PitchScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>BETA</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.headline}>
            Turn what you watch{'\n'}into what you do.
          </Text>
          <Text style={styles.subtext}>
            Save TikToks and Reels. Get structured, actionable plans. Build the habits you actually want.
          </Text>
          <View style={styles.features}>
            {[
              { symbol: '▶', text: 'Save any reel or TikTok link' },
              { symbol: '✦', text: 'AI extracts an actionable plan' },
              { symbol: '✓', text: 'Track what you actually try' },
            ].map((f) => (
              <View key={f.symbol} style={styles.featureRow}>
                <View style={styles.featureDot}>
                  <Text style={styles.featureDotText}>{f.symbol}</Text>
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button label="Get Started" onPress={() => router.push('/(onboarding)/insight-1')} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: 'center',
    gap: 28,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.labelCaps,
    color: colors.onPrimary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  body: {
    gap: spacing.stackGap,
  },
  headline: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  subtext: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  features: {
    gap: 12,
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureDotText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  featureText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.elementTight,
  },
});
