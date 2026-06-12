import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  TextInput, Platform, Dimensions, Image,
  PanResponder, Animated, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useChat } from '@/contexts/ChatContext';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { api, ChatMessage, ChatSource } from '@/services/api';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.85;

const SUGGESTED_PROMPTS = [
  { prompt: 'What recipes have I saved?', icon: 'restaurant-outline', color: '#f97316' },
  { prompt: 'Find my workout saves', icon: 'barbell-outline', color: '#22c55e' },
  { prompt: 'Any finance videos?', icon: 'trending-up-outline', color: '#3b82f6' },
  { prompt: 'Show me saves from this week', icon: 'calendar-outline', color: '#a855f7' },
] as const;

function TypingDots() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const dotStyle = (phase: number) => ({
    transform: [{
      translateY: anim.interpolate({
        inputRange: [
          Math.max(0, phase - 0.18),
          phase,
          Math.min(1, phase + 0.18),
        ],
        outputRange: [0, -6, 0],
        extrapolate: 'clamp',
      }),
    }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 }}>
      {[0.2, 0.5, 0.8].map((phase, i) => (
        <Animated.View
          key={i}
          style={[{
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: '#22c55e',
          }, dotStyle(phase)]}
        />
      ))}
    </View>
  );
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  streaming?: boolean;
};

export function ChatBottomSheet() {
  const { isOpen, closeChat } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const keyboardPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardPadding, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start(() => scrollRef.current?.scrollToEnd({ animated: true }));
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardPadding, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const handleClose = useCallback(() => {
    setMessages([]);
    setInput('');
    setBusy(false);
    translateY.setValue(SHEET_HEIGHT);
    backdropOpacity.setValue(0);
    keyboardPadding.setValue(0);
    closeChat();
  }, [closeChat]);

  // ref so panResponder callbacks always have the latest handleClose
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  const panResponder = useRef(
    PanResponder.create({
      // capture phase fires parent-first, intercepting ScrollView touches
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        scrollYRef.current <= 0 && gs.dy > 10 && gs.dy > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: SHEET_HEIGHT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => handleCloseRef.current());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  const handleVideoTap = useCallback(async (id: string) => {
    handleClose();
    try {
      const video = await api.videos.get(id);
      router.navigate('/(tabs)/library');
      if (video.category) {
        router.push(`/category/${encodeURIComponent(video.category)}`);
      }
      router.push(`/video/${id}`);
    } catch {
      router.push(`/video/${id}`);
    }
  }, [handleClose]);

  const send = useCallback((text: string) => {
    if (!text.trim() || busy) return;

    const trimmed = text.trim();
    setInput('');
    setBusy(true);

    const history: ChatMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    const aiId = `a-${Date.now()}`;
    const aiMsg: Message = { id: aiId, role: 'assistant', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    scrollToEnd();

    api.chat.stream(
      trimmed,
      history,
      (delta) => {
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, content: m.content + delta } : m)
        );
        scrollToEnd();
      },
      (sources) => {
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, sources } : m)
        );
        scrollToEnd();
      },
      () => {
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, streaming: false } : m)
        );
        setBusy(false);
      },
      (err) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === aiId
              ? { ...m, content: 'Something went wrong. Try again.', streaming: false }
              : m
          )
        );
        setBusy(false);
        console.error('Chat SSE error:', err);
      },
    ).catch((err) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? { ...m, content: 'Something went wrong. Try again.', streaming: false }
            : m
        )
      );
      setBusy(false);
      console.error('Chat SSE error:', err);
    });
  }, [input, busy, messages, scrollToEnd]);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <Animated.View style={{ flex: 1, paddingBottom: keyboardPadding }}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                Reel<Text style={styles.headerTitleGreen}>Scout</Text>
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.messages, messages.length === 0 && styles.messagesEmpty]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              onScroll={e => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Text style={styles.emptyIconText}>✦</Text>
                  </View>
                  <Text style={styles.emptyTitle}>Search your library</Text>
                  <Text style={styles.emptySubtitle}>Ask anything about your saved content</Text>
                  <View style={styles.prompts}>
                    {SUGGESTED_PROMPTS.map(({ prompt, icon, color }) => (
                      <TouchableOpacity
                        key={prompt}
                        style={styles.promptChip}
                        onPress={() => send(prompt)}
                        activeOpacity={0.65}
                      >
                        <View style={[styles.promptIcon, { backgroundColor: color + '18' }]}>
                          <Ionicons name={icon as any} size={16} color={color} />
                        </View>
                        <Text style={styles.promptText}>{prompt}</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                messages.map((msg) => (
                  <View key={msg.id} style={styles.msgWrapper}>
                    {msg.role === 'user' ? (
                      <View style={styles.userRow}>
                        <View style={styles.userBubble}>
                          <Text style={styles.userText}>{msg.content}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.aiRow}>
                          <View style={styles.aiBlock}>
                            {msg.streaming && !msg.content ? (
                              <TypingDots />
                            ) : (
                              <Text style={styles.aiText}>
                                {msg.content}
                                {msg.streaming && <Text style={styles.cursor}>▌</Text>}
                              </Text>
                            )}
                          </View>
                        </View>
                        {msg.sources && msg.sources.length > 0 && (
                          <View style={styles.sourcesBlock}>
                            {msg.sources.map((src) => (
                              <TouchableOpacity
                                key={src.id}
                                style={styles.sourceCard}
                                activeOpacity={0.75}
                                onPress={() => handleVideoTap(src.id)}
                              >
                                <View style={styles.sourceThumb}>
                                  {src.thumbnail_url ? (
                                    <Image source={{ uri: src.thumbnail_url }} style={styles.sourceThumbImg} />
                                  ) : (
                                    <Text style={styles.sourceThumbIcon}>▶</Text>
                                  )}
                                </View>
                                <View style={styles.sourceInfo}>
                                  <Text style={styles.sourceTitle} numberOfLines={2}>{src.title}</Text>
                                  <Text style={styles.sourceTap}>Open →</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask your library..."
                placeholderTextColor={colors.outline}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => send(input)}
                editable={!busy}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || busy) && styles.sendBtnDisabled]}
                onPress={() => send(input)}
                activeOpacity={0.8}
                disabled={!input.trim() || busy}
              >
                <Ionicons name="arrow-up" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#2e2e2e',
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#2e2e2e',
    borderRadius: radii.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerPadding,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1c',
  },
  headerTitle: {
    fontSize: 18,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_800ExtraBold',
  },
  headerTitleGreen: { color: colors.primary },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  messages: {
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 16,
    gap: 12,
  },
  messagesEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
    gap: 8,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconText: { fontSize: 22, color: colors.primary },
  emptyTitle: {
    fontSize: 18,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    marginBottom: 8,
  },
  prompts: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242424',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  promptText: {
    flex: 1,
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  msgWrapper: { gap: 8 },
  userRow: { alignItems: 'flex-end' },
  aiRow: { alignItems: 'flex-start' },
  userBubble: {
    maxWidth: '78%',
    backgroundColor: '#1c3a24',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  aiBlock: {
    maxWidth: '88%',
    gap: 10,
  },
  aiText: {
    ...typography.bodyBase,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  cursor: { color: colors.primary },
  sourcesBlock: { gap: 8, width: '100%' },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  sourceThumb: {
    width: 48,
    height: 48,
    backgroundColor: '#1c1c1c',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  sourceThumbImg: { width: 48, height: 48, borderRadius: radii.md },
  sourceThumbIcon: { fontSize: 13, color: colors.onSurfaceVariant },
  sourceInfo: { flex: 1, gap: 2 },
  sourceTitle: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
    lineHeight: 20,
  },
  sourceTap: { fontSize: 11, color: colors.primary, fontFamily: 'HankenGrotesk_600SemiBold' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: spacing.stackGap,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1c1c1c',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
});
