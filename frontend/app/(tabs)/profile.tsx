import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Flame } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { api, Profile } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { computeStreakLocal } from '@/lib/streak';

const CARD_GAP = 12;
const STAT_CARD_WIDTH = (Dimensions.get('window').width - spacing.containerPadding * 2 - CARD_GAP) / 2;

const SURFACE = '#1a1a1a';
const BORDER = '#2e2e2e';
const ORANGE = '#f97316';
const DIM_ORANGE = ORANGE + 'cc';

function getDisplayName(email: string | null): string {
  if (!email) return 'Explorer';
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function getAvatarInitial(email: string | null): string {
  if (!email) return 'E';
  return email.charAt(0).toUpperCase();
}

function getCuratorSince(createdAt: string): string {
  return `Curator since ${new Date(createdAt).getFullYear()}`;
}


export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/(auth)/sign-in');
      } },
    ]);
  };

  const load = useCallback(async () => {
    try {
      const p = await api.profile.get();
      setProfile(p);
      setError(false);
    } catch (e) {
      console.error('Profile load error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.onSurfaceVariant} />
          <Text style={{ ...typography.bodyBase, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular', textAlign: 'center' }}>
            Couldn't load. Check your connection.
          </Text>
          <TouchableOpacity onPress={load} hitSlop={12}>
            <Text style={{ ...typography.bodyBase, color: colors.primary, fontFamily: 'HankenGrotesk_600SemiBold' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const streak = computeStreakLocal(profile?.tried_at_values ?? []);
  const saved = profile?.explorer_total ?? 0;
  const tried = profile?.explorer_tried ?? 0;
  const pct = saved > 0 ? Math.round((tried / saved) * 100) : 0;

  const stats = [
    {
      id: 'saved',
      icon: 'bookmark-outline',
      value: String(saved),
      label: 'SAVED',
      iconColor: colors.primary,
      valueColor: colors.onSurface,
      flameIcon: false,
      watermark: false,
    },
    {
      id: 'tried',
      icon: 'checkmark-circle-outline',
      value: String(tried),
      label: 'TRIED',
      iconColor: colors.primary,
      valueColor: colors.onSurface,
      flameIcon: false,
      watermark: false,
    },
    {
      id: 'streak',
      icon: 'flame',
      value: `${streak}`,
      sub: streak === 1 ? ' day' : ' days',
      label: 'ACTIVE STREAK',
      iconColor: DIM_ORANGE,
      valueColor: DIM_ORANGE,
      cardBorder: ORANGE + '40',
      watermark: true,
      flameIcon: true,
      labelColor: DIM_ORANGE,
    },
    {
      id: 'score',
      icon: 'star-outline',
      value: String(tried),
      sub: `/${saved}`,
      label: 'EXPLORER SCORE',
      iconColor: colors.primary,
      valueColor: colors.onSurface,
      cardBorder: colors.primary + '40',
      flameIcon: false,
      watermark: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brandText}>Reel<Text style={styles.brandGreen}>Actions</Text></Text>
          <View style={styles.headerRight}>
            <View style={styles.fireBadge}>
              <Text style={styles.fireText}>🔥 {streak}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getAvatarInitial(profile?.email ?? null)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.nameSection}>
          <Text style={styles.name}>{getDisplayName(profile?.email ?? null)}</Text>
          <Text style={styles.since}>{profile ? getCuratorSince(profile.created_at) : ''}</Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View
              key={stat.id}
              style={[styles.statCard, stat.cardBorder ? { borderColor: stat.cardBorder } : {}]}
            >
              {stat.watermark && (
                <Flame size={80} color="#94a3b8" fill="#94a3b8" style={styles.watermark} />
              )}
              <View style={styles.iconWrap}>
                {stat.flameIcon ? (
                  <>
                    <Svg width={42} height={42} style={styles.glowLayer}>
                      <Defs>
                        <RadialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
                          <Stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                          <Stop offset="40%" stopColor="#f97316" stopOpacity="0.12" />
                          <Stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                        </RadialGradient>
                      </Defs>
                      <Circle cx={21} cy={21} r={21} fill="url(#flameGlow)" />
                    </Svg>
                    <Flame size={22} color={DIM_ORANGE} fill={DIM_ORANGE} />
                  </>
                ) : (
                  <View style={styles.iconBg}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.iconColor} />
                  </View>
                )}
              </View>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: stat.valueColor }]}>{stat.value}</Text>
                {stat.sub && <Text style={styles.statSub}>{stat.sub}</Text>}
              </View>
              <Text style={[styles.statLabel, stat.labelColor ? { color: stat.labelColor } : {}]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.explorerCard}>
          <View style={styles.explorerTop}>
            <Text style={styles.explorerPct}>{pct}% COMPLETE</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.signOutRow} activeOpacity={0.7} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </TouchableOpacity>
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
    paddingBottom: spacing.navHeight + 20,
    gap: spacing.stackGap,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandText: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  brandGreen: {
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fireBadge: {
    backgroundColor: ORANGE + '20',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fireText: {
    ...typography.bodySm,
    color: ORANGE,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'HankenGrotesk_700Bold',
    color: colors.background,
  },
  nameSection: {
    alignItems: 'center',
    gap: 4,
  },
  name: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  since: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    backgroundColor: SURFACE,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    opacity: 0.28,
    right: 0,
    bottom: 35,
  },
  iconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1c',
  },
  glowLayer: {
    position: 'absolute',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 8,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  statSub: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  statLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
    marginTop: 2,
  },
  explorerCard: {
    backgroundColor: SURFACE,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  explorerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  explorerPct: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  progressTrack: {
    height: 5,
    backgroundColor: BORDER,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  settingsSection: {
    gap: spacing.elementTight,
  },
  sectionLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
    paddingHorizontal: 4,
  },
  settingsList: {
    backgroundColor: SURFACE,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.cardInner,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  settingsRowLast: {
    borderBottomWidth: 0,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.cardInner,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  signOutLabel: {
    ...typography.bodyBase,
    color: colors.error,
    fontFamily: 'HankenGrotesk_400Regular',
  },
});
