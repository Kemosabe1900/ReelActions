import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radii } from '@/constants/theme';

const PERCENTAGES = ['10%', '30%', '50%', '70%', '90%'];

export default function Question2Screen() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Habit Assessment</Text>
          <Text style={styles.question}>How much of what you save do you apply?</Text>
          <Text style={styles.subtitle}>Transitioning from passive consumption to active habit tracking</Text>
        </View>

        <View style={styles.percentages}>
          {PERCENTAGES.map((pct) => (
            <TouchableOpacity
              key={pct}
              style={[styles.pctButton, selected === pct && styles.pctButtonActive]}
              onPress={() => setSelected(pct)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pctText, selected === pct && styles.pctTextActive]}>{pct}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>EXECUTION RATIO</Text>
          <Text style={styles.infoText}>
            The median user applies <Text style={styles.infoHighlight}>30%</Text> of their saved content.
          </Text>
          <Text style={styles.infoBody}>
            Aiming for 50%+ helps you build long-term discipline.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue →" onPress={() => router.push('/(auth)/sign-up')} />
        <Button label="I'm not sure yet" variant="ghost" onPress={() => router.push('/(auth)/sign-up')} />
      </View>
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
    paddingBottom: 20,
    gap: spacing.stackGap,
  },
  header: {
    gap: 8,
  },
  title: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  question: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  percentages: {
    flexDirection: 'row',
    gap: spacing.elementTight,
  },
  pctButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  pctButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pctText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  pctTextActive: {
    color: colors.onPrimary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  infoText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  infoHighlight: {
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  infoBody: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  footer: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.elementTight,
  },
});
