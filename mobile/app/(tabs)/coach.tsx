import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

const FREE_CHAT_LIMIT = 5;

type Message = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };
type Session = { id: string; title: string; created_at: string; updated_at: string };

const STARTER_PROMPTS = [
  { emoji: '📈', text: 'How do I improve my ATS score?' },
  { emoji: '💰', text: 'What salary should I expect for my skills?' },
  { emoji: '🎯', text: 'How should I prepare for behavioral interviews?' },
  { emoji: '🤝', text: 'How do I negotiate a job offer?' },
  { emoji: '⚡', text: 'What skills should I add to get more matches?' },
];

export default function CoachTab() {
  const { user } = useAuthStore();
  const isPro = user?.subscription === 'pro';
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  const { data: usageData } = useQuery({
    queryKey: ['my-usage'],
    queryFn: () => api.get('/subscriptions/my-usage').then((r) => r.data),
    enabled: !isPro,
    staleTime: 30_000,
  });

  const chatsUsed: number = usageData?.usage?.chat?.used ?? 0;
  const chatsRemaining = Math.max(0, FREE_CHAT_LIMIT - chatsUsed);
  const limitReached = !isPro && chatsRemaining === 0;

  const { data: sessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/ai/chat/sessions').then((r) => r.data),
    enabled: showHistory,
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (msg: string) =>
      api.post('/ai/chat', { message: msg, session_id: sessionId }),
    onSuccess: (res) => {
      const data = res.data;
      setSessionId(data.session_id);
      setMessages(data.messages);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['my-usage'] });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (err: any) => {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      const code = err?.response?.data?.detail?.code;
      if (code === 'monthly_limit_reached') {
        queryClient.invalidateQueries({ queryKey: ['my-usage'] });
        Alert.alert(
          'Monthly Limit Reached',
          `Free plan includes ${FREE_CHAT_LIMIT} AI chats per month. Upgrade to Pro for unlimited coaching.`,
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') },
          ],
        );
      } else {
        Alert.alert('Error', 'Could not get a response. Please try again.');
      }
    },
  });

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isPending) return;
    const tempMsg: Message = { id: 'temp-' + Date.now(), role: 'user', content: msg, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempMsg]);
    setInput('');
    sendMessage(msg);
  }, [input, isPending, sendMessage]);

  const loadSession = async (sid: string) => {
    try {
      const res = await api.get(`/ai/chat/sessions/${sid}`);
      setSessionId(sid);
      setMessages(res.data.messages);
      setShowHistory(false);
    } catch {
      Alert.alert('Error', 'Could not load this conversation. Please try again.');
    }
  };

  const newChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput('');
    setShowHistory(false);
  };

  if (showHistory) {
    const groupedSessions = (sessions as Session[] ?? []).reduce<Record<string, Session[]>>((acc, s) => {
      const date = new Date(s.updated_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      let group = 'Earlier';
      if (date.toDateString() === today.toDateString()) group = 'Today';
      else if (date.toDateString() === yesterday.toDateString()) group = 'Yesterday';
      if (!acc[group]) acc[group] = [];
      acc[group].push(s);
      return acc;
    }, {});

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.histHeader}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.backBtnWrap}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.histTitle}>Chat History</Text>
          <TouchableOpacity onPress={newChat} style={styles.newChatWrap}>
            <Text style={styles.newChatBtn}>+ New</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.histList}>
          {Object.entries(groupedSessions).map(([group, items]) => (
            <View key={group}>
              <Text style={styles.histGroup}>{group}</Text>
              {items.map((s) => (
                <TouchableOpacity key={s.id} style={[styles.histItem, Shadow.sm]} onPress={() => loadSession(s.id)}>
                  <View style={styles.histItemIcon}>
                    <Text style={{ fontSize: 14, color: Colors.primary }}>✦</Text>
                  </View>
                  <View style={styles.histItemContent}>
                    <Text style={styles.histItemTitle} numberOfLines={1}>{s.title}</Text>
                    <Text style={styles.histItemDate}>
                      {new Date(s.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={styles.histChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {(sessions?.length ?? 0) === 0 && (
            <View style={styles.emptyHistWrap}>
              <Text style={styles.emptyHistIcon}>✦</Text>
              <Text style={styles.emptyHist}>No chat history yet</Text>
              <Text style={styles.emptyHistSub}>Start a conversation with your AI coach</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header — dark glass style */}
        <View style={styles.chatHeader}>
          <View style={styles.aiAvatarLarge}>
            <Text style={styles.aiAvatarText}>✦</Text>
          </View>
          <View style={styles.chatHeaderText}>
            <Text style={styles.chatHeaderTitle}>AI Career Coach</Text>
            <Text style={styles.chatHeaderSub}>Powered by AI · Always available</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={newChat} style={[styles.headerBtn, styles.headerBtnPrimary]}>
              <Text style={[styles.headerBtnText, { color: Colors.primary }]}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Usage banner */}
        {!isPro && (
          <TouchableOpacity
            style={[styles.usageBanner, limitReached && styles.usageBannerLimit]}
            onPress={() => router.push('/paywall')}
            activeOpacity={0.8}
          >
            <Text style={[styles.usageBannerText, limitReached && { color: Colors.danger }]}>
              {limitReached
                ? `Monthly limit reached (${FREE_CHAT_LIMIT}/${FREE_CHAT_LIMIT}) · Tap to upgrade`
                : `${chatsRemaining} free chat${chatsRemaining !== 1 ? 's' : ''} remaining · Upgrade for unlimited`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Messages or Starter */}
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.starterContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.starterHeroWrap}>
              <View style={styles.starterHeroIcon}>
                <Text style={styles.starterHeroIconText}>✦</Text>
              </View>
              <Text style={styles.starterHeading}>How can I help you?</Text>
              <Text style={styles.starterSubheading}>Ask me anything about your career journey</Text>
            </View>
            <View style={styles.starterGrid}>
              {STARTER_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.text}
                  style={[styles.starterCard, Shadow.sm]}
                  onPress={() => { sendMessage(p.text); }}
                  activeOpacity={0.85}
                >
                  <View style={styles.starterEmojiWrap}>
                    <Text style={styles.starterEmoji}>{p.emoji}</Text>
                  </View>
                  <Text style={styles.starterText}>{p.text}</Text>
                  <Text style={styles.starterArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                {item.role === 'assistant' && (
                  <View style={styles.assistantAvatar}>
                    <Text style={styles.avatarText}>✦</Text>
                  </View>
                )}
                <View style={[
                  styles.bubbleContent,
                  item.role === 'user' ? styles.userContent : styles.assistantContent,
                ]}>
                  <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.assistantText]}>
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
            ListFooterComponent={
              isPending ? (
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <View style={styles.assistantAvatar}>
                    <Text style={styles.avatarText}>✦</Text>
                  </View>
                  <View style={[styles.bubbleContent, styles.assistantContent]}>
                    <View style={styles.typingDots}>
                      <ActivityIndicator size="small" color={Colors.tertiaryBright} />
                      <Text style={styles.typingText}>Thinking…</Text>
                    </View>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, Shadow.md]}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask your career coach…"
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isPending || limitReached) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isPending || limitReached}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  usageBanner: {
    backgroundColor: Colors.primaryLight + '50',
    borderBottomWidth: 1, borderBottomColor: Colors.primary + '20',
    paddingVertical: 8, paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  usageBannerLimit: {
    backgroundColor: Colors.danger + '10',
    borderBottomColor: Colors.danger + '30',
  },
  usageBannerText: {
    ...Typography.caption, color: Colors.primary,
    fontWeight: '600', textAlign: 'center',
  },

  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: HeroColors.base,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(91,46,255,0.3)',
  },
  aiAvatarLarge: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  aiAvatarText: { color: Colors.tertiaryBright, fontSize: 16 },
  chatHeaderText: { flex: 1 },
  chatHeaderTitle: { ...Typography.h4, color: HeroColors.text },
  chatHeaderSub: { ...Typography.caption, color: HeroColors.textDim },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  headerBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: HeroColors.border,
  },
  headerBtnPrimary: {
    backgroundColor: Colors.primaryLight + '20', borderColor: Colors.primaryLight + '40',
  },
  headerBtnText: { ...Typography.caption, color: HeroColors.textDim, fontWeight: '600' },

  starterContainer: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  starterHeroWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  starterHeroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: HeroColors.base,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '40',
    ...Shadow.md,
  },
  starterHeroIconText: { fontSize: 28, color: Colors.tertiaryBright },
  starterHeading: { ...Typography.h2, color: Colors.text, marginBottom: 4, textAlign: 'center' },
  starterSubheading: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  starterGrid: { gap: Spacing.sm },
  starterCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  starterEmojiWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  starterEmoji: { fontSize: 18 },
  starterText: { ...Typography.label, color: Colors.text, flex: 1 },
  starterArrow: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },

  messageList: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.md },
  bubble: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  assistantAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: HeroColors.base,
    borderWidth: 1, borderColor: Colors.primary + '40',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: Colors.tertiaryBright, fontSize: 12 },
  bubbleContent: { maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md },
  userContent: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
    ...Shadow.sm,
  },
  assistantContent: {
    backgroundColor: Colors.surfaceGlass,
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.tertiaryBright + '35',
    ...Shadow.sm,
  },
  bubbleText: { ...Typography.body, lineHeight: 22 },
  userText: { color: Colors.textInverse },
  assistantText: { color: Colors.text },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { ...Typography.caption, color: Colors.textMuted },

  inputBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    padding: Spacing.sm, gap: Spacing.sm, alignItems: 'flex-end',
  },
  textInput: {
    flex: 1, backgroundColor: Colors.surfaceLow, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10, maxHeight: 100,
    ...Typography.body, color: Colors.text,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    ...Shadow.sm,
  },
  sendBtnDisabled: { backgroundColor: Colors.backgroundDim },
  sendBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 18 },

  histHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: HeroColors.base,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.xxl,
    borderBottomWidth: 1, borderBottomColor: 'rgba(91,46,255,0.3)',
  },
  backBtnWrap: { minWidth: 60 },
  backBtn: { ...Typography.label, color: HeroColors.textDim },
  histTitle: { ...Typography.h4, color: HeroColors.text },
  newChatWrap: { minWidth: 60, alignItems: 'flex-end' },
  newChatBtn: { ...Typography.label, color: Colors.tertiaryBright },
  histList: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  histGroup: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  histItem: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  histItemIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  histItemContent: { flex: 1 },
  histItemTitle: { ...Typography.label, color: Colors.text },
  histItemDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  histChevron: { fontSize: 20, color: Colors.textMuted },
  emptyHistWrap: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyHistIcon: { fontSize: 32, marginBottom: Spacing.md, color: Colors.primary },
  emptyHist: { ...Typography.h4, color: Colors.text, marginBottom: 4 },
  emptyHistSub: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
});
