import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

type Message = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };
type Session = { id: string; title: string; created_at: string; updated_at: string };

const STARTER_PROMPTS = [
  'How do I improve my ATS score?',
  'What salary should I expect for my skills?',
  'How should I prepare for behavioral interviews?',
  'How do I negotiate a job offer?',
  'What skills should I add to get more matches?',
];

export default function CoachTab() {
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

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
  });

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isPending) return;
    // Optimistic UI: add user message immediately
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    };
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
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.histHeader}>
          <TouchableOpacity onPress={() => setShowHistory(false)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.histTitle}>Chat History</Text>
          <TouchableOpacity onPress={newChat}>
            <Text style={styles.newChatBtn}>+ New</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.histList}>
          {(sessions as Session[] ?? []).map((s) => (
            <TouchableOpacity key={s.id} style={[styles.histItem, Shadow.sm]} onPress={() => loadSession(s.id)}>
              <Text style={styles.histItemTitle} numberOfLines={1}>{s.title}</Text>
              <Text style={styles.histItemDate}>{new Date(s.updated_at).toLocaleDateString('en-IN')}</Text>
            </TouchableOpacity>
          ))}
          {(sessions?.length ?? 0) === 0 && (
            <Text style={styles.emptyHist}>No chat history yet</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <View>
            <Text style={styles.chatHeaderTitle}>AI Career Coach</Text>
            <Text style={styles.chatHeaderSub}>Ask me anything about your career</Text>
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

        {/* Messages */}
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.starterContainer}>
            <Text style={styles.starterHeading}>How can I help you today?</Text>
            <Text style={styles.starterSubheading}>I'm your personal career coach. Try one of these or ask your own question:</Text>
            {STARTER_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={[styles.starterCard, Shadow.sm]}
                onPress={() => { setInput(prompt); sendMessage(prompt); setInput(''); }}
              >
                <Text style={styles.starterText}>{prompt}</Text>
                <Text style={styles.starterArrow}>→</Text>
              </TouchableOpacity>
            ))}
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
                    <Text style={styles.avatarText}>AI</Text>
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
                    <Text style={styles.avatarText}>AI</Text>
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

        {/* Input */}
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

  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  chatHeaderTitle: { ...Typography.h4, color: Colors.text },
  chatHeaderSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  headerBtnPrimary: { backgroundColor: Colors.primary + '12', borderColor: Colors.primary + '40' },
  headerBtnText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },

  starterContainer: { padding: Spacing.lg, gap: Spacing.sm },
  starterHeading: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  starterSubheading: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 22 },
  starterCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  starterText: { ...Typography.label, color: Colors.text, flex: 1 },
  starterArrow: { color: Colors.primary, fontWeight: '700', fontSize: 16 },

  messageList: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.md },
  bubble: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  assistantAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { ...Typography.caption, color: Colors.textInverse, fontWeight: '700' },
  bubbleContent: { maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md },
  userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  assistantContent: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleText: { ...Typography.body, lineHeight: 22 },
  userText: { color: Colors.textInverse },
  assistantText: { color: Colors.text },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { ...Typography.bodySmall, color: Colors.textMuted },

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
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 18 },

  histHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { ...Typography.label, color: Colors.primary },
  histTitle: { ...Typography.h4, color: Colors.text },
  newChatBtn: { ...Typography.label, color: Colors.primary },
  histList: { padding: Spacing.md, gap: Spacing.sm },
  histItem: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histItemTitle: { ...Typography.label, color: Colors.text, flex: 1, marginRight: Spacing.sm },
  histItemDate: { ...Typography.caption, color: Colors.textMuted },
  emptyHist: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', paddingTop: Spacing.xxl },
});
