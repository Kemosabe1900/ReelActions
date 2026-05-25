import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TouchableHighlight, ActivityIndicator, Animated, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { getCategoryColor } from '@/constants/categories';
import { api, Video, Profile } from '@/services/api';
import { SaveVideoSheet } from '@/components/SaveVideoSheet';

type PendingJob = { jobId: string; videoId: string; url: string; failed: boolean };

function SaveItem({ save, onPress, onLongPress }: { save: Video; onPress: () => void; onLongPress: () => void }) {
  return (
    <TouchableHighlight onPress={onPress} onLongPress={onLongPress} delayLongPress={150} underlayColor="#1e1e1e" activeOpacity={1} style={styles.saveItem}>
      <View style={styles.saveItemInner}>
        <LinearGradient colors={['#1c1c1c', '#252525']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumbnail}>
          <Ionicons name="play" size={18} color="#22c55e" />
        </LinearGradient>
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            {save.category && (
              <View style={[styles.categoryChip, { backgroundColor: getCategoryColor(save.category) + '20' }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(save.category) }]}>{save.category}</Text>
              </View>
            )}
            {save.tried && (
              <View style={styles.triedChip}>
                <Text style={styles.triedText}>✓ tried</Text>
              </View>
            )}
          </View>
          <Text style={styles.saveTitle}>{save.title ?? 'Processing...'}</Text>
        </View>
        <SourceIcon url={save.url} />
      </View>
    </TouchableHighlight>
  );
}

function ContextMenu({
  video,
  onClose,
  onDelete,
  onToggleTried,
  onRename,
}: {
  video: Video;
  onClose: () => void;
  onDelete: () => void;
  onToggleTried: () => void;
  onRename: () => void;
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
          {!video.tried && (
            <TouchableOpacity style={styles.contextAction} onPress={onToggleTried}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.contextActionText, { color: colors.primary }]}>Mark tried</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.contextAction} onPress={onRename}>
            <Ionicons name="pencil-outline" size={20} color={colors.onSurface} />
            <Text style={styles.contextActionText}>Rename</Text>
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

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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

function SourceIcon({ url }: { url: string }) {
  if (url.includes('tiktok.com')) return <Ionicons name="logo-tiktok" size={14} color={colors.onSurfaceVariant} />;
  if (url.includes('instagram.com')) return <FontAwesome5 name="instagram" size={14} color={colors.onSurfaceVariant} />;
  return <Ionicons name="play-circle-outline" size={14} color={colors.onSurfaceVariant} />;
}

function getActiveDaysFromVideos(videos: Video[]): number[] {
  const now = new Date();
  const todayIndex = (now.getDay() + 6) % 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - todayIndex);
  startOfWeek.setHours(0, 0, 0, 0);
  const active = new Set<number>();
  for (const v of videos) {
    if (!v.tried_at) continue;
    const d = new Date(v.tried_at);
    if (d >= startOfWeek) active.add((d.getDay() + 6) % 7);
  }
  return Array.from(active);
}


export default function HomeScreen() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [contextVideo, setContextVideo] = useState<Video | null>(null);
  const [renameVideo, setRenameVideo] = useState<Video | null>(null);
  const [renameText, setRenameText] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActiveDaysRef = useRef<number[]>([]);
  const isFirstVideoLoad = useRef(true);
  const dotAnimations = useRef(DAYS.map(() => new Animated.Value(1))).current;
  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const celebrateTranslateY = useRef(new Animated.Value(10)).current;

  const animateDot = useCallback((dayIndex: number) => {
    const anim = dotAnimations[dayIndex];
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, friction: 2, tension: 100, useNativeDriver: false }).start();

    celebrateOpacity.setValue(0);
    celebrateTranslateY.setValue(10);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(celebrateOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(celebrateTranslateY, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]),
      Animated.delay(1200),
      Animated.timing(celebrateOpacity, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();
  }, [dotAnimations, celebrateOpacity, celebrateTranslateY]);

  const load = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([api.videos.list(), api.profile.get()]);
      setVideos(v);
      setProfile(p);
      setError(false);
    } catch (e) {
      console.error('Home load error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const initialLoad = useRef(true);
  useFocusEffect(useCallback(() => {
    const first = initialLoad.current;
    if (first) { initialLoad.current = false; load(); }
    else { api.videos.list().then(setVideos).catch(() => {}); api.profile.get().then(setProfile).catch(() => {}); }
  }, [load]));

  useEffect(() => {
    const active = pendingJobs.filter(j => !j.failed);
    if (active.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      for (const job of active) {
        try {
          const status = await api.jobs.get(job.jobId);
          if (status.status === 'completed') {
            setPendingJobs(prev => prev.filter(j => j.jobId !== job.jobId));
            load();
          } else if (status.status === 'failed') {
            setPendingJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, failed: true } : j));
          }
        } catch {}
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingJobs, load]);

  useEffect(() => {
    if (isFirstVideoLoad.current) {
      isFirstVideoLoad.current = false;
      prevActiveDaysRef.current = [...getActiveDaysFromVideos(videos)];
      return;
    }
    const newActiveDays = getActiveDaysFromVideos(videos);
    const newDots = newActiveDays.filter(d => !prevActiveDaysRef.current.includes(d));
    newDots.forEach(d => animateDot(d));
    prevActiveDaysRef.current = [...newActiveDays];
  }, [videos]);

  const handleSubmitted = useCallback((jobId: string, videoId: string, url: string) => {
    setPendingJobs(prev => [...prev, { jobId, videoId, url, failed: false }]);
  }, []);

  const handleDelete = async (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
    try {
      await api.videos.delete(id);
    } catch (e) {
      api.videos.list().then(setVideos).catch(() => {});
    }
  };

  const handleToggleTried = async (id: string) => {
    try {
      const updated = await api.videos.toggleTried(id);
      setVideos(prev => prev.map(v => v.id === id ? updated : v));
    } catch (e) {
      console.error('Toggle tried error:', e);
    }
  };

  const handleRename = async () => {
    if (!renameVideo || !renameText.trim()) return;
    const id = renameVideo.id;
    const newTitle = renameText.trim();
    setRenameVideo(null);
    setVideos(prev => prev.map(v => v.id === id ? { ...v, title: newTitle } : v));
    try {
      await api.videos.rename(id, newTitle);
    } catch {
      api.videos.list().then(setVideos).catch(() => {});
    }
  };

  const recent = videos.slice(0, 4);
  const resurface = videos.filter(v => !v.tried).at(-1) ?? null;

  const streak = profile?.current_streak ?? 0;
  const tried = profile?.explorer_tried ?? 0;
  const total = profile?.explorer_total ?? 0;
  const pct = total > 0 ? Math.round((tried / total) * 100) : 0;
  const activeDays = getActiveDaysFromVideos(videos);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.logo}>Reel<Text style={styles.logoGreen}>Actions</Text></Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakCount}>{streak}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowSave(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        <SaveVideoSheet
          visible={showSave}
          onClose={() => setShowSave(false)}
          onSubmitted={handleSubmitted}
        />

        <View style={styles.explorerCard}>
          <View style={styles.explorerTop}>
            <Text style={styles.explorerLabel}>EXPLORER SCORE</Text>
            <Text style={styles.explorerPercent}>{pct}% complete</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.explorerSub}>{tried}/{total} saves tried</Text>

          <View style={styles.calendar}>
            {DAYS.map((day, i) => (
              <View key={i} style={styles.calendarCol}>
                <Text style={styles.calendarDay}>{day}</Text>
                <Animated.View
                  style={[
                    styles.calendarDot,
                    activeDays.includes(i) && styles.calendarDotActive,
                    { transform: [{ scale: dotAnimations[i] }] },
                  ]}
                />
              </View>
            ))}
          </View>

          <Animated.View style={{
            opacity: celebrateOpacity,
            transform: [{ translateY: celebrateTranslateY }],
            alignItems: 'center',
            height: celebrateOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }),
            marginTop: celebrateOpacity.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }),
            overflow: 'hidden',
          }}>
            <Text style={{ color: colors.primary, fontFamily: 'HankenGrotesk_700Bold', fontSize: 13 }}>
              ✓ Tried! Keep the streak going 🔥
            </Text>
          </Animated.View>
        </View>

        {(pendingJobs.length > 0 || recent.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Saves</Text>
            <View style={styles.saveList}>
              {pendingJobs.map((job, idx) => (
                <View key={job.jobId}>
                  <View style={styles.saveItem}>
                    <View style={styles.thumbnail}>
                      {job.failed
                        ? <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
                        : <ActivityIndicator size="small" color={colors.primary} />}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.saveTitle}>{job.failed ? 'Processing failed' : 'Processing...'}</Text>
                      <Text style={styles.saveMeta} numberOfLines={1}>{job.url}</Text>
                    </View>
                    {job.failed && (
                      <TouchableOpacity hitSlop={12} onPress={() => setPendingJobs(prev => prev.filter(j => j.jobId !== job.jobId))}>
                        <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {(idx < pendingJobs.length - 1 || recent.length > 0) && <View style={styles.separator} />}
                </View>
              ))}
              {recent.map((save, idx) => (
                <View key={save.id}>
                  <SaveItem
                    save={save}
                    onPress={() => router.push(`/video/${save.id}`)}
                    onLongPress={() => setContextVideo(save)}
                  />
                  {idx < recent.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {videos.length === 0 && pendingJobs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📱</Text>
            <Text style={styles.emptyTitle}>Start your collection</Text>
            <Text style={styles.emptyText}>Save your first TikTok or Reel. ReelActions will extract everything worth knowing from it.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowSave(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={colors.background} />
              <Text style={styles.emptyBtnText}>Save your first Reel</Text>
            </TouchableOpacity>
          </View>
        )}

        {resurface && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resurface</Text>
            <TouchableOpacity
              style={styles.resurfaceCard}
              activeOpacity={0.75}
              onPress={() => router.push(`/video/${resurface.id}`)}
            >
              <LinearGradient colors={['#1c1c1c', '#252525']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumbnail}>
                <Ionicons name="play" size={18} color="#22c55e" />
              </LinearGradient>
              <View style={styles.cardContent}>
                {resurface.category && (
                  <View style={[styles.categoryChip, { backgroundColor: getCategoryColor(resurface.category) + '20' }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColor(resurface.category) }]}>{resurface.category}</Text>
                  </View>
                )}
                <Text style={styles.saveTitle}>{resurface.title ?? 'Processing...'}</Text>
                <Text style={styles.saveMeta}>Saved {timeAgo(resurface.created_at)}</Text>
              </View>
              <SourceIcon url={resurface.url} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {contextVideo && (
        <ContextMenu
          video={contextVideo}
          onClose={() => setContextVideo(null)}
          onDelete={() => { handleDelete(contextVideo.id); setContextVideo(null); }}
          onToggleTried={() => { handleToggleTried(contextVideo.id); setContextVideo(null); }}
          onRename={() => {
            setRenameText(contextVideo.title ?? '');
            setRenameVideo(contextVideo);
            setContextVideo(null);
          }}
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
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  logo: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  logoGreen: {
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  streakEmoji: { fontSize: 16 },
  streakCount: {
    ...typography.titleLg,
    color: colors.secondary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  explorerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.cardInner,
    gap: 10,
  },
  explorerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  explorerLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  explorerPercent: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  explorerSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  calendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  calendarCol: {
    alignItems: 'center',
    gap: 6,
  },
  calendarDay: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  calendarDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.outlineVariant,
  },
  calendarDotActive: {
    backgroundColor: colors.primary,
  },
  section: {
    gap: spacing.elementTight,
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
    marginBottom: 4,
  },
  saveList: {
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  saveItem: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  saveItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2e2e2e',
    marginLeft: 72,
  },
  thumbnail: {
    width: 56,
    height: 56,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  categoryText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  triedChip: {
    backgroundColor: colors.primary + '20',
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  triedText: {
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  saveTitle: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  saveMeta: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  chevron: {
    fontSize: 22,
    color: colors.outline,
  },
  resurfaceCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.cardInner,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  emptyText: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  emptyBtnText: {
    ...typography.bodyBase,
    color: colors.background,
    fontFamily: 'HankenGrotesk_700Bold',
  },
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
