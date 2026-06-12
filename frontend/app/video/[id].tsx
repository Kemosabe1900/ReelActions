import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Share, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { getCategoryColor } from '@/constants/categories';
import { api, Video } from '@/services/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getSource(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Reels';
  return 'Video';
}

function SourceIcon({ url, size, color }: { url: string; size: number; color: string }) {
  if (url.includes('tiktok.com')) return <Ionicons name="logo-tiktok" size={size} color={color} />;
  if (url.includes('instagram.com')) return <FontAwesome5 name="instagram" size={size} color={color} />;
  return <Ionicons name="open-outline" size={size} color={color} />;
}

function StructuredData({ category, data }: { category: string | null; data: Record<string, unknown> | null }) {
  if (!data) return null;

  const cat = (category ?? '').toLowerCase();

  if (cat === 'workouts' || cat === 'workout' || cat === 'fitness') {
    const d = data as any;
    return (
      <View style={styles.structuredBlock}>
        <Text style={styles.blockLabel}>WORKOUT DETAILS</Text>
        {!!d.duration_minutes && <Row label="Duration" value={`${d.duration_minutes} min`} />}
        {d.equipment?.length > 0 && <Row label="Equipment" value={d.equipment.join(', ')} />}
        {d.muscle_groups?.length > 0 && <Row label="Muscles" value={d.muscle_groups.join(', ')} />}
        {d.exercises?.length > 0 && (
          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Exercises</Text>
            {d.exercises.map((ex: any, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listItemText}>
                  {ex.name}
                  {ex.sets ? ` — ${ex.sets} sets` : ''}
                  {ex.reps ? ` × ${ex.reps} reps` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (cat === 'recipes' || cat === 'cooking' || cat === 'food') {
    const d = data as any;
    return (
      <View style={styles.structuredBlock}>
        <Text style={styles.blockLabel}>RECIPE DETAILS</Text>
        {d.cuisine && <Row label="Cuisine" value={d.cuisine} />}
        {!!d.servings && <Row label="Servings" value={String(d.servings)} />}
        {!!d.prep_time_minutes && <Row label="Prep" value={`${d.prep_time_minutes} min`} />}
        {!!d.cook_time_minutes && <Row label="Cook" value={`${d.cook_time_minutes} min`} />}
        {d.ingredients?.length > 0 && (
          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Ingredients</Text>
            {d.ingredients.map((ing: string, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listItemText}>{ing}</Text>
              </View>
            ))}
          </View>
        )}
        {d.steps?.length > 0 && (
          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Steps</Text>
            {d.steps.map((step: string, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>{i + 1}.</Text>
                <Text style={styles.listItemText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (cat === 'finance' || cat === 'money' || cat === 'business') {
    const d = data as any;
    return (
      <View style={styles.structuredBlock}>
        <Text style={styles.blockLabel}>KEY TAKEAWAYS</Text>
        {d.topic && <Row label="Topic" value={d.topic} />}
        {d.risk_level && <Row label="Risk Level" value={d.risk_level} />}
        {d.key_concepts?.length > 0 && (
          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Key Concepts</Text>
            {d.key_concepts.map((c: string, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listItemText}>{c}</Text>
              </View>
            ))}
          </View>
        )}
        {d.action_items?.length > 0 && (
          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Action Items</Text>
            {d.action_items.map((a: string, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>→</Text>
                <Text style={styles.listItemText}>{a}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  const d = data as any;
  const hasContent = d.key_concepts?.length > 0 || d.action_items?.length > 0;
  if (!hasContent) return null;

  return (
    <View style={styles.structuredBlock}>
      <Text style={styles.blockLabel}>KEY TAKEAWAYS</Text>
      {d.key_concepts?.length > 0 && (
        <View style={styles.listBlock}>
          <Text style={styles.listTitle}>Key Concepts</Text>
          {d.key_concepts.map((c: string, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listBullet}>•</Text>
              <Text style={styles.listItemText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
      {d.action_items?.length > 0 && (
        <View style={styles.listBlock}>
          <Text style={styles.listTitle}>Action Items</Text>
          {d.action_items.map((a: string, i: number) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listBullet}>→</Text>
              <Text style={styles.listItemText}>{a}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const v = await api.videos.get(id!);
      setVideo(v);
    } catch (e) {
      console.error('Video load error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleToggleTried = async () => {
    if (!video) return;
    try {
      const updated = await api.videos.toggleTried(video.id);
      setVideo(updated);
    } catch (e) {
      console.error('Toggle tried error:', e);
    }
  };

  const handleShare = () => {
    if (!video) return;
    Share.share({ message: video.url });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, video?.category ? { color: getCategoryColor(video.category) } : null]}>{video?.category ?? ''}</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={12} style={styles.headerBtn} disabled={!video}>
          <Ionicons name="share-outline" size={22} color={video ? colors.onSurface : 'transparent'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !video ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.onSurfaceVariant} />
          <Text style={{ ...typography.bodyBase, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular', textAlign: 'center' }}>
            Couldn't load. Check your connection.
          </Text>
          <TouchableOpacity onPress={load} hitSlop={12}>
            <Text style={{ ...typography.bodyBase, color: colors.primary, fontFamily: 'HankenGrotesk_600SemiBold' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            {video.thumbnail_url ? (
              <Image source={{ uri: video.thumbnail_url }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroFallback}>
                <SourceIcon url={video.url} size={56} color={colors.onSurfaceVariant} />
              </View>
            )}
            <View style={styles.sourceCorner}>
              <SourceIcon url={video.url} size={16} color="#ffffff" />
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.videoTitle}>{video.title ?? 'Untitled'}</Text>
            <Text style={styles.videoMeta}>{formatDate(video.created_at)}</Text>
          </View>

          <View style={styles.actionsRow}>
            {video.tried ? (
              <View style={[styles.triedButton, styles.triedButtonActive]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.background} />
                <Text style={[styles.triedButtonText, styles.triedButtonTextActive]}>Tried it!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.triedButton}
                onPress={handleToggleTried}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.triedButtonText}>Mark as tried</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.openButton}
              onPress={() => Linking.openURL(video.url)}
              activeOpacity={0.8}
            >
              <SourceIcon url={video.url} size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.openButtonText}>Original</Text>
            </TouchableOpacity>
          </View>

          {video.summary && (
            <View style={styles.summaryBlock}>
              <Text style={styles.blockLabel}>SUMMARY</Text>
              <Text style={styles.summaryText}>{video.summary}</Text>
            </View>
          )}

          <StructuredData category={video.category} data={video.structured_data} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  headerBtn: { width: 36, alignItems: 'center' },
  headerTitle: {
    flex: 1,
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_600SemiBold',
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 40,
    gap: spacing.stackGap,
  },
  hero: {
    height: 220,
    backgroundColor: '#1a1a1a',
    borderRadius: radii.xl,
    marginTop: spacing.stackGap,
    overflow: 'hidden',
    position: 'relative',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  sourceCorner: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  titleBlock: { gap: 4 },
  videoTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  videoMeta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  triedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 12,
  },
  triedButtonActive: { backgroundColor: colors.primary },
  triedButtonText: {
    ...typography.bodyBase,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  triedButtonTextActive: { color: colors.background },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  openButtonText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  summaryBlock: {
    backgroundColor: '#1a1a1a',
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  blockLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  summaryText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    lineHeight: 22,
  },
  structuredBlock: {
    backgroundColor: '#1a1a1a',
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  rowValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
    flexShrink: 1,
    textAlign: 'right',
  },
  listBlock: { gap: 8 },
  listTitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  listItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  listBullet: {
    ...typography.bodyBase,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
    minWidth: 24,
    textAlign: 'right',
  },
  listItemText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    flex: 1,
    lineHeight: 22,
  },
});
