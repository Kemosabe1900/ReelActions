import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, typography, spacing, radii } from '@/constants/theme';

type Message = { id: string; role: 'user' | 'assistant'; content: string; card?: ContentCard };
type ContentCard = { title: string; category: string; source: string; time: string };

const INITIAL_MESSAGES: Message[] = [
  { id: '1', role: 'user', content: 'What workouts have I saved? Find me a quick recipe' },
  { id: '2', role: 'user', content: 'Find me that pasta recipe I saved earlier today.' },
  {
    id: '3',
    role: 'assistant',
    content: "Of course! You saved this TikTok from earlier today. It's a classic Pasta Carbonara that takes about 15 minutes.",
    card: { title: 'Pasta Carbonara', category: 'Cooking', source: 'TikTok', time: '2h ago' },
  },
  { id: '4', role: 'user', content: 'Any workout suggestions for tomorrow morning?' },
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={spacing.navHeight}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reel<Text style={styles.titleGreen}>Actions</Text></Text>
          <View style={styles.fireBadge}>
            <Text style={styles.fireText}>🔥 7</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={msg.role === 'user' ? styles.userRow : styles.aiRow}>
              {msg.role === 'assistant' && (
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>✦</Text>
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
          <TouchableOpacity style={styles.micButton}>
            <Text style={styles.micIcon}>🎤</Text>
          </TouchableOpacity>
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.stackGap,
    paddingBottom: spacing.elementTight,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  titleGreen: {
    color: colors.primary,
  },
  fireBadge: {
    backgroundColor: colors.secondary + '20',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fireText: {
    ...typography.bodySm,
    color: colors.secondary,
    fontFamily: 'HankenGrotesk_700Bold',
  },
  messages: {
    paddingHorizontal: spacing.containerPadding,
    paddingBottom: 20,
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
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  aiAvatarText: {
    fontSize: 14,
    color: colors.onPrimary,
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
    width: 44,
    height: 44,
    backgroundColor: colors.outlineVariant,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardThumbIcon: {
    fontSize: 16,
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
    ...typography.labelCaps,
    color: colors.primary,
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 10,
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
  micButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  micIcon: {
    fontSize: 18,
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
    maxHeight: 120,
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
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
