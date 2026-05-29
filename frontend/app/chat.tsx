import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Animated, Keyboard, Platform, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Message = { id: string; role: 'user' | 'assistant'; content: string; card?: ContentCard };
type ContentCard = { title: string; category: string; source: string; time: string };

const INITIAL_MESSAGES: Message[] = [
  { id: '1', role: 'user', content: 'Find me that pasta recipe I saved earlier today.' },
  {
    id: '2',
    role: 'assistant',
    content: "Of course! You saved this TikTok earlier today. It's a classic Pasta Carbonara that takes about 15 minutes.",
    card: { title: 'Pasta Carbonara', category: 'Cooking', source: 'TikTok', time: '2h ago' },
  },
  { id: '3', role: 'user', content: 'Any workout suggestions for tomorrow morning?' },
];

export default function ChatModal() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start(() => scrollRef.current?.scrollToEnd({ animated: true }));
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 250,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  function sendMessage() {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Searching your library...',
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.backdrop} onPress={() => router.back()} activeOpacity={1} />

      <Animated.View style={[styles.sheet, { marginBottom: keyboardOffset }]}>
        <View style={styles.handle} />

        <View style={styles.sheetHeader}>
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>✦</Text>
          </View>
          <View style={styles.sheetTitleWrap}>
            <Text style={styles.sheetTitle}>AI Assistant</Text>
            <Text style={styles.sheetSubtitle}>Ask about your saved reels</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View key={msg.id} style={msg.role === 'user' ? styles.userRow : styles.aiRow}>
              {msg.role === 'assistant' && (
                <View style={styles.msgAvatar}>
                  <Text style={styles.msgAvatarText}>✦</Text>
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
                  {msg.content}
                </Text>
                {msg.card && (
                  <View style={styles.contentCard}>
                    <View style={styles.cardThumb}>
                      <Text style={styles.cardThumbIcon}>▶</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.cardCategory}>
                        <Text style={styles.cardCategoryText}>{msg.card.category}</Text>
                      </View>
                      <Text style={styles.cardTitle}>{msg.card.title}</Text>
                      <Text style={styles.cardMeta}>{msg.card.source} · {msg.card.time}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your library..."
            placeholderTextColor={colors.outline}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} activeOpacity={0.8}>
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: SCREEN_HEIGHT * 0.67,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: 12,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiAvatarText: {
    fontSize: 16,
    color: colors.background,
    fontWeight: '700',
  },
  sheetTitleWrap: {
    flex: 1,
    gap: 1,
  },
  sheetTitle: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  sheetSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messages: {
    paddingHorizontal: spacing.containerPadding,
    paddingVertical: 12,
    gap: spacing.elementTight,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgAvatar: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  msgAvatarText: {
    fontSize: 11,
    color: colors.background,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  userBubble: {
    backgroundColor: '#1c3a24',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  userText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  aiText: {
    ...typography.bodyBase,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  contentCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.lg,
    padding: 10,
    alignItems: 'center',
  },
  cardThumb: {
    width: 40,
    height: 40,
    backgroundColor: colors.outlineVariant,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardThumbIcon: {
    fontSize: 14,
    color: colors.onSurface,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardCategory: {
    backgroundColor: colors.primary + '20',
    borderRadius: radii.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  cardCategoryText: {
    fontSize: 10,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_600SemiBold',
  },
  cardMeta: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontFamily: 'HankenGrotesk_400Regular',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: spacing.stackGap,
    paddingTop: spacing.elementTight,
    gap: spacing.elementTight,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.cardInner,
    paddingVertical: 12,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 20,
    color: colors.background,
    fontWeight: '700',
  },
});
