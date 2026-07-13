import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { getCategoryColor } from '@/constants/categories';
import { api, Video } from '@/services/api';
import { useData } from '@/contexts/DataContext';
import { ChangeCategorySheet } from '@/components/ChangeCategorySheet';
import { VideoThumb } from '@/components/VideoThumb';

function ContextMenu({
  video,
  onClose,
  onDelete,
  onRename,
  onChangeCategory,
}: {
  video: Video;
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
  onChangeCategory: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.contextBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.contextSheet} onPress={() => {}}>
          <Text style={styles.contextTitle} numberOfLines={2}>{video.title ?? 'Untitled'}</Text>
          <View style={styles.contextSeparator} />
          <TouchableOpacity style={styles.contextAction} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.contextActionText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contextAction} onPress={onRename}>
            <Ionicons name="pencil-outline" size={20} color={colors.onSurface} />
            <Text style={styles.contextActionText}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contextAction} onPress={onChangeCategory}>
            <Ionicons name="folder-outline" size={20} color={colors.onSurface} />
            <Text style={styles.contextActionText}>Change category</Text>
          </TouchableOpacity>
          <View style={styles.contextSeparator} />
          <TouchableOpacity style={styles.contextAction} onPress={onClose}>
            <Text style={[styles.contextActionText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function RenameModal({
  text,
  onChangeText,
  onCancel,
  onSave,
}: {
  text: string;
  onChangeText: (t: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.renameBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <View style={styles.renameCard}>
          <Text style={styles.renameTitle}>Rename</Text>
          <TextInput
            style={styles.renameInput}
            value={text}
            onChangeText={onChangeText}
            autoFocus
            selectTextOnFocus
            placeholderTextColor={colors.onSurfaceVariant}
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
          <View style={styles.renameActions}>
            <TouchableOpacity style={styles.renameCancelBtn} onPress={onCancel}>
              <Text style={styles.renameCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.renameSaveBtn, !text.trim() && { opacity: 0.4 }]}
              onPress={onSave}
              disabled={!text.trim()}
            >
              <Text style={styles.renameSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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

  const { videos: allVideos, loading, error, refresh } = useData();
  const videos = useMemo(() => allVideos.filter(v => v.category === categoryName), [allVideos, categoryName]);
  const allCategories = useMemo(() => [...new Set(allVideos.map(v => v.category).filter(Boolean) as string[])], [allVideos]);

  const [contextVideo, setContextVideo] = useState<Video | null>(null);
  const [changeCategoryVideo, setChangeCategoryVideo] = useState<Video | null>(null);
  const [renameVideo, setRenameVideo] = useState<Video | null>(null);
  const [renameText, setRenameText] = useState('');

  const load = refresh;

  const handleToggleTried = async (id: string) => {
    try {
      await api.videos.toggleTried(id);
      refresh();
    } catch (e) {
      console.error('Toggle tried error:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.videos.delete(id);
      refresh();
    } catch {
      refresh();
    }
  };

  const handleRename = async () => {
    if (!renameVideo || !renameText.trim()) return;
    const id = renameVideo.id;
    const newTitle = renameText.trim();
    setRenameVideo(null);
    try {
      await api.videos.rename(id, newTitle);
      refresh();
    } catch {
      refresh();
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
          {(() => {
            const total = videos.length;
            const ratio = total > 0 ? tried / total : 0;
            const totalMinutes = videos.reduce((sum, v) => {
              const sd = (v.structured_data ?? {}) as Record<string, any>;
              const d = Number(sd.duration_minutes ?? sd.duration ?? 1);
              return sum + (isFinite(d) ? d : 1);
            }, 0);
            const totalMins = Math.round(totalMinutes);
            return (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>COMPLETED</Text>
                  <View style={styles.statNumRow}>
                    <Text style={styles.statBigGreen}>{tried}</Text>
                    <Text style={styles.statDenom}>/ {total}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
                  </View>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>TOTAL TIME</Text>
                  <View style={styles.statNumRow}>
                    <Text style={styles.statBigWhite}>{totalMins}</Text>
                    <Text style={styles.statDenom}>min</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {videos.map((video, idx) => {
            const isTikTok = video.url.includes('tiktok.com');
            const isInstagram = video.url.includes('instagram.com');
            return (
              <React.Fragment key={video.id}>
              {idx > 0 && <View style={styles.separator} />}
              <TouchableOpacity
                style={styles.videoCard}
                activeOpacity={0.75}
                onPress={() => router.push(`/video/${video.id}`)}
                onLongPress={() => setContextVideo(video)}
                delayLongPress={150}
              >
                <View style={styles.thumbnailWrapper}>
                  <VideoThumb uri={video.thumbnail_url} />
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
                    {isTikTok && <Ionicons name="logo-tiktok" size={14} color={colors.onSurfaceVariant} />}
                    {isInstagram && <FontAwesome5 name="instagram" size={14} color={colors.onSurfaceVariant} />}
                    {!isTikTok && !isInstagram && <Ionicons name="play-circle-outline" size={14} color={colors.onSurfaceVariant} />}
                    <Text style={styles.videoDate}>{timeAgo(video.created_at)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              </React.Fragment>
            );
          })}

          {videos.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No saves yet</Text>
            </View>
          )}
        </ScrollView>
      )}
      {contextVideo && (
        <ContextMenu
          video={contextVideo}
          onClose={() => setContextVideo(null)}
          onDelete={() => { handleDelete(contextVideo.id); setContextVideo(null); }}
          onRename={() => { setRenameText(contextVideo.title ?? ''); setRenameVideo(contextVideo); setContextVideo(null); }}
          onChangeCategory={() => { setChangeCategoryVideo(contextVideo); setContextVideo(null); }}
        />
      )}
      {renameVideo && (
        <RenameModal
          text={renameText}
          onChangeText={setRenameText}
          onCancel={() => setRenameVideo(null)}
          onSave={handleRename}
        />
      )}
      {changeCategoryVideo && (
        <ChangeCategorySheet
          visible
          videoId={changeCategoryVideo.id}
          currentCategory={changeCategoryVideo.category}
          existingCategories={allCategories}
          onClose={() => setChangeCategoryVideo(null)}
          onUpdated={() => {
            refresh();
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
    gap: 12,
    marginBottom: spacing.elementTight,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    padding: 16,
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: 'HankenGrotesk_700Bold',
    color: colors.onSurfaceVariant,
  },
  statNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statBigGreen: {
    fontSize: 32,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: colors.primary,
    letterSpacing: -1,
  },
  statBigWhite: {
    fontSize: 32,
    fontFamily: 'HankenGrotesk_800ExtraBold',
    color: colors.onSurface,
    letterSpacing: -1,
  },
  statDenom: {
    fontSize: 14,
    fontFamily: 'HankenGrotesk_600SemiBold',
    color: colors.onSurfaceVariant,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#2e2e2e',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  videoCard: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#2e2e2e',
    marginLeft: 72,
  },
  thumbnailWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  thumbnail: {
    width: 56,
    height: 56,
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
  contextBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  contextSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  contextTitle: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    paddingHorizontal: 4,
    paddingBottom: 12,
  },
  contextSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2e2e2e',
    marginVertical: 4,
  },
  contextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  contextActionText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  renameCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  renameTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  renameInput: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  renameActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  renameCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  renameCancelText: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  renameSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  renameSaveText: {
    ...typography.bodyBase,
    color: colors.background,
    fontFamily: 'HankenGrotesk_700Bold',
  },
});
