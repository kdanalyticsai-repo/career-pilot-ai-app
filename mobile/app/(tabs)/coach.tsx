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
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

type Message = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };
type Session = { id: string; title: string; created_at: string; updated_at: string };

const STARTER_PROMPTS = [
  { emoji: '📈', text: 'How do I improve my ATS score?' },
  { emoji: '💰', text: 'What salary should I expect for my skills?' },
  { emoji: '🎯', text: 'How should I prepare for behavioral interviews?' },
  { emoji: '🤝', text: 'How do I negotiate a job offer?' },
  { emoji: '⚡', text: 'What skills should I add to get more matches?' },
];

function PaywallGate() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.paywallWrap}>
        <View style={styles.paywallIconWrap}>
          <Text style={styles.paywallIcon}>✦</Text>
        </View>
        <Text style={styles.paywallTitle}>AI Career Coach</Text>
        <Text style={styles.paywallSub}>
          Unlimited career coaching, interview prep tips, salary guidance, and more — exclusively for Pro members.
        </Text>

        <View style={styles.paywallFeatures}>
          {[
            'Unlimited AI chat sessions',
            'Personalized career advice',
            'Interview & negotiation coaching',
            'Resume improvement suggestions',
          ].map((f) => (
            <View key={f} style={styles.paywallFeatureRow}>
              <Text style={styles.paywallFeatureCheck}>✓</Text>
              <Text style={styles.paywallFeatureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.paywallBtn}
          onPress={() => router.push('/paywall')}
          activeOpacity={0.85}
        >
          <Text style={styles.paywallBtnText}>Upgrade to Pro — ₹199/month</Text>
        </TouchableOpacity>

        <Text style={styles.paywallNote}>Cancel anytime · Instant access</Text>
      </View>
    </SafeAreaView>
  );
}

export default function CoachTab() {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  if (user?.subscription !== 'pro') {
    return <PaywallGate />;
  }

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
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: () => {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      Alert.alert('Error', 'Could not get a response. Please try again.');
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
    const res = await api.get(`/ai/chat/sessions/${sid}`);
    setSessionId(sid);
    setMessages(res.data.messages);
    setShowHistory(false);
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
                    <Text style={{ fontSize: 14 }}>✦</Text>
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
        {/* Header */}
        <View style={styles.chatHeader}>
          <View style={styles.aiAvatarLarge}>
            <Text style={styles.aiAvatarText}>✦</Text>
          </View>
          <View style={styles.chatHeaderText}>
            <Text style={styles.chatHeaderTitle}>AI Career Coach</Text>
            <Text style={styles.chatHeaderSub}>Powered by GPT-4.1 Nano</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={newChat} style={[styles.headerBtn, styles.headerBtnPrimary]}>
              <Text style={[styles.headerBtnText, { color: Colors.primary }]}>New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages or Starter */}
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.starterContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.starterHeading}>How can I help you?</Text>
            <Text style={styles.starterSubheading}>Ask me anything about your career journey</Text>
            <View style={styles.starterGrid}>
              {STARTER_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.text}
                  style={[styles.starterCard, Shadow.sm]}
                  onPress={() => { setInput(p.text); sendMessage(p.text); setInput(''); }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.starterEmoji}>{p.emoji}</Text>
                  <Text style={styles.starterText}>{p.text}</Text>
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
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                {item.role === 'assistant' && (
                  <View style={styles.assistantAvatar}>
                    <Text style={styles.avatarText}>✦</Text>
                  </View>
                )}
                <View style={[styles.bubbleContent, item.role === 'user' ? styles.userContent : styles.assistantContent]}>
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
                      <ActivityIndicator size="small" color={Colors.primary} />
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
            style={[styles.sendBtn, (!input.trim() || isPending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isPending}
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

  paywallWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.xl,
  },
  paywallIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg, ...Shadow.md,
  },
  paywallIcon: { fontSize: 36, color: Colors.textInverse },
  paywallTitle: { ...Typography.h2, color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  paywallSub: {
    ...Typography.body, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing.xl,
  },
  paywallFeatures: { alignSelf: 'stretch', marginBottom: Spacing.xl },
  paywallFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  paywallFeatureCheck: { fontSize: 16, color: Colors.tertiary, fontWeight: '700', width: 20 },
  paywallFeatureText: { ...Typography.label, color: Colors.text },
  paywallBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    alignSelf: 'stretch', alignItems: 'center', ...Shadow.md,
  },
  paywallBtnText: { ...Typography.label, color: Colors.textInverse, fontSize: 15 },
  paywallNote: { ...Typography.caption, color: Colors.textMuted, marginTop: Spacing.sm },

  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm,
  },
  aiAvatarLarge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  aiAvatarText: { color: Colors.textInverse, fontSize: 16 },
  chatHeaderText: { flex: 1 },
  chatHeaderTitle: { ...Typography.h4, color: Colors.text },
  chatHeaderSub: { ...Typography.caption, color: Colors.textMuted },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  headerBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  headerBtnPrimary: { backgroundColor: Colors.primaryLight + '50', borderColor: Colors.primary + '40' },
  headerBtnText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },

  starterContainer: { padding: Spacing.lg },
  starterHeading: { ...Typography.h2, color: Colors.text, marginBottom: 4 },
  starterSubheading: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  starterGrid: { gap: Spacing.sm },
  starterCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  starterEmoji: { fontSize: 20, width: 30 },
  starterText: { ...Typography.label, color: Colors.text, flex: 1 },

  messageList: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.md },
  bubble: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  assistantAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: Colors.textInverse, fontSize: 12 },
  bubbleContent: { maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md },
  userContent: {
    backgroundColor: Colors.primary, borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: Colors.surface, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
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
    flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 10, maxHeight: 100,
    ...Typography.body, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.surfaceMid },
  sendBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 18 },

  histHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtnWrap: { minWidth: 60 },
  backBtn: { ...Typography.label, color: Colors.primary },
  histTitle: { ...Typography.h4, color: Colors.text },
  newChatWrap: { minWidth: 60, alignItems: 'flex-end' },
  newChatBtn: { ...Typography.label, color: Colors.primary },
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
    backgroundColor: Colors.primaryLight + '50', alignItems: 'center', justifyContent: 'center',
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
