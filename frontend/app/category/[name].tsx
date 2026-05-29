import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { getCategoryColor } from '@/constants/categories';
import { api, Video } from '@/services/api';
import { ChangeCategorySheet } from '@/components/ChangeCategorySheet';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 2) return 'Yesterday';
  if (days < 7) return `${Math.floor(days)} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getSource(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Reels';
  return 'Video';
}

export default function CategoryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const categoryName = decodeURIComponent(name ?? '');

  const [videos, setVideos] = useState<Video[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [changeCategoryVideo, setChangeCategoryVideo] = useState<Video | null>(null);

  const load = useCallback(async () => {
    try {
      const [v, all] = await Promise.all([
        api.videos.list({ category: categoryName }),
        api.videos.list(),
      ]);
      setVideos(v);
      setAllCategories([...new Set(all.map(v => v.category).filter(Boolean) as string[])]);
      setError(false);
    } catch (e) {
      console.error('Category load error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryName]);

  useEffect(() => { load(); }, [load]);

  const handleToggleTried = async (id: string) => {
    try {
      const updated = await api.videos.toggleTried(id);
      setVideos(prev => prev.map(v => v.id === id ? updated : v));
    } catch (e) {
      console.error('Toggle tried error:', e);
    }
  };

  const tried = videos.filter(v => v.tried).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: getCategoryColor(categoryName) }]}>{categoryName}</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
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
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{videos.length}</Text>
              <Text style={styles.statLabel}>SAVED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{tried}</Text>
              <Text style={styles.statLabel}>TRIED</Text>
            </View>
          </View>

          {videos.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoCard}
              activeOpacity={0.75}
              onPress={() => router.push(`/video/${video.id}`)}
              onLongPress={() => setChangeCategoryVideo(video)}
              delayLongPress={150}
            >
              <View style={styles.thumbnailWrapper}>
                <LinearGradient colors={['#1c1c1c', '#252525']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumbnail}>
                  <Ionicons name="play" size={20} color="#22c55e" />
                </LinearGradient>
                {video.tried && (
                  <View style={styles.triedOverlay}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  </View>
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {video.title ?? 'Processing...'}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.sourceBadge}>
                    <Text style={styles.sourceBadgeText}>{getSource(video.url)}</Text>
                  </View>
                  <Text style={styles.videoDate}>{timeAgo(video.created_at)}</Text>
                </View>
              </View>
              {video.tried ? (
                <View style={styles.triedBtn}>
                  <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.triedBtn}
                  onPress={(e) => { e.stopPropagation(); handleToggleTried(video.id); }}
                  hitSlop={8}
                >
                  <Ionicons name="checkmark-circle-outline" size={26} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {videos.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No saves yet</Text>
            </View>
          )}
        </ScrollView>
      )}
      {changeCategoryVideo && (
        <ChangeCategorySheet
          visible
          videoId={changeCategoryVideo.id}
          currentCategory={changeCategoryVideo.category}
          existingCategories={allCategories}
          onClose={() => setChangeCategoryVideo(null)}
          onUpdated={() => {
            setVideos(prev => prev.filter(v => v.id !== changeCategoryVideo.id));
            setChangeCategoryVideo(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    paddingBottom: 32,
    gap: spacing.elementTight,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    marginBottom: spacing.elementTight,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 2,
  },
  statNum: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  statLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2e2e2e',
    marginVertical: 12,
  },
  videoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: radii.lg,
    padding: spacing.cardInner,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  thumbnailWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triedOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.background,
    borderRadius: radii.full,
  },
  cardContent: { flex: 1, gap: 6 },
  videoTitle: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceBadge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sourceBadgeText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  videoDate: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  triedBtn: { flexShrink: 0, padding: 2 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { ...typography.bodyBase, color: colors.onSurfaceVariant, fontFamily: 'HankenGrotesk_400Regular' },
});
