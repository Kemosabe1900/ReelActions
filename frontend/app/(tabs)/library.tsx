import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { getCategoryColor, getCategoryIcon } from '@/constants/categories';
import { Video } from '@/services/api';
import { useData } from '@/contexts/DataContext';

const CARD_GAP = 12;
const CARD_WIDTH = (Dimensions.get('window').width - spacing.containerPadding * 2 - CARD_GAP) / 2;
const GLOW_SIZE = CARD_WIDTH * 1.8;

function getProgressColor(tried: number, total: number): string {
  if (total > 0 && tried >= total) return '#22c55e';
  if (tried > 0) return '#f97316';
  return '#ffffff';
}


type CategoryStat = { name: string; tried: number; total: number };

function groupByCategory(videos: Video[]): CategoryStat[] {
  const map: Record<string, CategoryStat> = {};
  for (const v of videos) {
    if (!v.category) continue;
    const cat = v.category;
    if (!map[cat]) map[cat] = { name: cat, tried: 0, total: 0 };
    map[cat].total++;
    if (v.tried) map[cat].tried++;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export default function LibraryScreen() {
  const { videos, profile, loading, error, refresh } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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
          <TouchableOpacity onPress={refresh} hitSlop={12}>
            <Text style={{ ...typography.bodyBase, color: colors.primary, fontFamily: 'HankenGrotesk_600SemiBold' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const categories = groupByCategory(videos);
  const streak = profile?.current_streak ?? 0;
  const tried = profile?.explorer_tried ?? 0;
  const total = profile?.explorer_total ?? 0;
  const pct = total > 0 ? Math.round((tried / total) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.libraryLabel}>Your Library</Text>
            <Text style={styles.title}>Reel<Text style={styles.titleGreen}>Actions</Text></Text>
          </View>
          <View style={styles.fireBadge}>
            <Text style={styles.fireText}>🔥 {streak}</Text>
          </View>
        </View>

        <Text style={styles.totalCount}>{videos.length} saves total</Text>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>Nothing here yet. Share a video from Instagram or TikTok to ReelActions to get started.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const pctCat = cat.total > 0 ? cat.tried / cat.total : 0;
              const progressColor = getProgressColor(cat.tried, cat.total);
              const glowColor = getCategoryColor(cat.name);
              return (
                <TouchableOpacity
                  key={cat.name}
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/category/${encodeURIComponent(cat.name)}`)}
                >
                  <LinearGradient
                    colors={['#1c1c1c', '#111111']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.glow, { backgroundColor: glowColor, transform: [{ scale: 1.6 }] }]} />
                  <View style={styles.emojiWrap}>
                    <Ionicons name={getCategoryIcon(cat.name) as any} size={40} color={progressColor} />
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pctCat * 100}%` as any, backgroundColor: progressColor }]} />
                    </View>
                    <Text style={[styles.progressLabel, { color: progressColor }]}>
                      {cat.tried}/{cat.total} tried
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.milestoneCard}>
          <View style={styles.milestoneHeader}>
            <Text style={styles.milestoneTitle}>Weekly Explorer Score</Text>
            <Text style={styles.milestonePct}>{pct}%</Text>
          </View>
          <View style={styles.milestoneTrack}>
            <View style={[styles.milestoneFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.milestoneComplete}>{tried}/{total} saves tried</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    paddingBottom: spacing.navHeight + 20,
    gap: spacing.stackGap,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  libraryLabel: { ...typography.bodySm, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular' },
  title: { fontSize: 30, lineHeight: 36, color: colors.onSurface, fontFamily: 'HankenGrotesk_800ExtraBold' },
  titleGreen: { color: colors.primary },
  fireBadge: { backgroundColor: colors.secondary + '20', borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 6 },
  fireText: { ...typography.bodySm, color: colors.secondary, fontFamily: 'HankenGrotesk_700Bold' },
  totalCount: { ...typography.bodySm, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular', marginTop: -8 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },

  emptyText: { ...typography.bodyBase, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  card: {
    width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: radii.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14,
    alignItems: 'center', justifyContent: 'space-between',
  },
  glow: {
    position: 'absolute', width: GLOW_SIZE, height: GLOW_SIZE, borderRadius: GLOW_SIZE / 2,
    opacity: 0.13, top: '50%', left: '50%', marginTop: -(GLOW_SIZE / 2), marginLeft: -(GLOW_SIZE / 2),
  },
  emojiWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  cardBottom: { width: '100%', gap: 5, zIndex: 1 },
  catName: { ...typography.bodyBase, color: colors.onSurface, fontFamily: 'HankenGrotesk_700Bold', textAlign: 'center' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radii.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.full },
  progressLabel: { fontSize: 11, fontFamily: 'HankenGrotesk_600SemiBold', textAlign: 'center' },
  milestoneCard: {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.cardInner,
    gap: 8, borderWidth: 1, borderColor: colors.secondary + '30',
  },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneTitle: { ...typography.bodyBase, color: colors.onSurface, fontFamily: 'HankenGrotesk_700Bold' },
  milestonePct: { ...typography.bodyBase, color: colors.primary, fontFamily: 'HankenGrotesk_700Bold' },
  milestoneTrack: { height: 5, backgroundColor: colors.outlineVariant, borderRadius: radii.full, overflow: 'hidden' },
  milestoneFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.full },
  milestoneComplete: { ...typography.bodySm, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular', marginTop: -2 },
});
