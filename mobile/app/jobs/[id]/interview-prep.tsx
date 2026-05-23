import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

type BehavioralQ = { question: string; why_asked: string; sample_answer_framework: string };
type TechnicalQ = { question: string; topic: string; difficulty: 'easy' | 'medium' | 'hard' };

const DIFF_COLOR = { easy: Colors.matchHigh, medium: Colors.matchMid, hard: Colors.danger };

export default function InterviewPrepScreen() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const [prep, setPrep] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'behavioral' | 'technical' | 'tips'>('behavioral');
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then((r) => r.data),
  });

  const { data: resumeData, isLoading: resumesLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.get('/resumes').then((r) => r.data),
    staleTime: 30_000,
  });

  const resumes: any[] = resumeData?.resumes ?? [];
  const primary = resumes.find((r) => r.is_primary) ?? resumes[0] ?? null;
  const noResume = !resumesLoading && !primary;
  const resumeProcessing = !resumesLoading && primary && primary.status !== 'ready';

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => api.post('/ai/interview-prep', { job_id: jobId }),
    onSuccess: (res) => { setErrorMsg(''); setPrep(res.data); },
    onError: (err: any) => {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail ?? '';
      if (status === 404 || detail.toLowerCase().includes('no resume')) {
        setErrorMsg('no_resume');
      } else if (status === 400 && detail.toLowerCase().includes('processing')) {
        setErrorMsg('processing');
      } else {
        setErrorMsg('generic');
      }
    },
  });

  const TABS = [
    { key: 'behavioral', label: 'Behavioral' },
    { key: 'technical', label: 'Technical' },
    { key: 'tips', label: 'Tips & Research' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Job header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{job?.title ?? 'Interview Prep'}</Text>
        <Text style={styles.headerCompany}>{job?.company}</Text>
      </View>

      {!prep && !isPending && noResume && (
        <View style={styles.centerContent}>
          <View style={[styles.gateCard, Shadow.sm]}>
            <Text style={styles.gateIcon}>📄</Text>
            <Text style={styles.gateTitle}>Upload a Resume First</Text>
            <Text style={styles.gateBody}>
              To generate personalized interview questions, you need to upload your resume first.
            </Text>
            <TouchableOpacity style={styles.gateBtn} onPress={() => router.push('/resume/upload')}>
              <Text style={styles.gateBtnText}>Upload Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!prep && !isPending && resumeProcessing && (
        <View style={styles.centerContent}>
          <View style={[styles.gateCard, Shadow.sm]}>
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginBottom: Spacing.md }} />
            <Text style={styles.gateTitle}>Resume Being Analyzed</Text>
            <Text style={styles.gateBody}>
              Your resume is still being analyzed by AI. This usually takes under 30 seconds.
              Come back once it's ready to generate your interview prep.
            </Text>
          </View>
        </View>
      )}

      {!prep && !isPending && !noResume && !resumeProcessing && (
        <View style={styles.centerContent}>
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>AI Interview Preparation</Text>
            <Text style={styles.cardBody}>
              Get personalized behavioral and technical interview questions tailored to this specific role and your resume.
            </Text>
            <View style={styles.featureList}>
              {['5 behavioral Q&As with STAR answer frameworks', '5 technical questions by difficulty', 'Smart questions to ask the interviewer', 'Research tips specific to this company'].map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={styles.featureDot}>→</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.generateBtn} onPress={() => generate()}>
              <Text style={styles.generateBtnText}>Generate Interview Prep</Text>
            </TouchableOpacity>
            {errorMsg === 'no_resume' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>No resume found. Please upload a resume first.</Text>
                <TouchableOpacity onPress={() => router.push('/resume/upload')} style={styles.errorLink}>
                  <Text style={styles.errorLinkText}>Upload Resume →</Text>
                </TouchableOpacity>
              </View>
            )}
            {errorMsg === 'processing' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>Your resume is still being analyzed. Please wait a moment and try again.</Text>
              </View>
            )}
            {errorMsg === 'generic' && (
              <Text style={styles.errorText}>Failed to generate prep. Please try again.</Text>
            )}
          </View>
        </View>
      )}

      {isPending && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Generating your prep guide…</Text>
        </View>
      )}

      {prep && (
        <>
          {/* Tabs */}
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {activeTab === 'behavioral' && prep.behavioral_questions?.map((q: BehavioralQ, i: number) => (
              <TouchableOpacity
                key={i}
                style={[styles.flipCard, Shadow.sm]}
                activeOpacity={0.9}
                onPress={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
              >
                {!flipped[i] ? (
                  <View style={styles.cardFront}>
                    <View style={styles.qHeader}>
                      <View style={styles.qNum}><Text style={styles.qNumText}>Q{i + 1}</Text></View>
                      <Text style={styles.tapHint}>Tap for answer →</Text>
                    </View>
                    <Text style={styles.question}>{q.question}</Text>
                    <Text style={styles.whyAsked}>Why asked: {q.why_asked}</Text>
                  </View>
                ) : (
                  <View style={styles.cardBack}>
                    <Text style={styles.answerLabel}>STAR Framework</Text>
                    <Text style={styles.answerText}>{q.sample_answer_framework}</Text>
                    <Text style={styles.tapHintBack}>Tap to see question again</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {activeTab === 'technical' && prep.technical_questions?.map((q: TechnicalQ, i: number) => (
              <View key={i} style={[styles.techCard, Shadow.sm]}>
                <View style={styles.techHeader}>
                  <View style={styles.topicBadge}>
                    <Text style={styles.topicText}>{q.topic}</Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: DIFF_COLOR[q.difficulty] + '18' }]}>
                    <Text style={[styles.diffText, { color: DIFF_COLOR[q.difficulty] }]}>{q.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.techQuestion}>{q.question}</Text>
              </View>
            ))}

            {activeTab === 'tips' && (
              <>
                {prep.questions_to_ask?.length > 0 && (
                  <TipSection
                    title="Questions to Ask Them"
                    icon="?"
                    color={Colors.primary}
                    items={prep.questions_to_ask}
                  />
                )}
                {prep.prep_tips?.length > 0 && (
                  <TipSection
                    title="Preparation Tips"
                    icon="★"
                    color={Colors.warning}
                    items={prep.prep_tips}
                  />
                )}
                {prep.role_research_points?.length > 0 && (
                  <TipSection
                    title="Research Points"
                    icon="🔍"
                    color={Colors.secondary}
                    items={prep.role_research_points}
                  />
                )}
              </>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function TipSection({ title, icon, color, items }: { title: string; icon: string; color: string; items: string[] }) {
  return (
    <View style={[tipStyles.card, Shadow.sm]}>
      <View style={tipStyles.sectionHeader}>
        <Text style={tipStyles.sectionIcon}>{icon}</Text>
        <Text style={tipStyles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item: string, i: number) => (
        <View key={i} style={tipStyles.item}>
          <View style={[tipStyles.dot, { backgroundColor: color }]} />
          <Text style={tipStyles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const tipStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { ...Typography.h4, color: Colors.text },
  item: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  itemText: { ...Typography.body, color: Colors.text, flex: 1, lineHeight: 22 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h4, color: Colors.text },
  headerCompany: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  centerContent: { flex: 1, padding: Spacing.md, justifyContent: 'center' },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  cardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  cardBody: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },

  featureList: { gap: 8, marginBottom: Spacing.lg },
  featureRow: { flexDirection: 'row', gap: 8 },
  featureDot: { color: Colors.primary, fontWeight: '700', width: 16 },
  featureText: { ...Typography.body, color: Colors.text, flex: 1 },

  generateBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  generateBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
  loadingText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md },

  gateCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  gateIcon: { fontSize: 48, marginBottom: Spacing.sm },
  gateTitle: { ...Typography.h3, color: Colors.text, textAlign: 'center' },
  gateBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  gateBtn: { marginTop: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: Spacing.xl, alignSelf: 'stretch', alignItems: 'center' },
  gateBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700', fontSize: 15 },

  errorBox: { marginTop: Spacing.sm, backgroundColor: Colors.danger + '10', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.danger + '30', padding: Spacing.md, gap: Spacing.xs },
  errorBoxText: { ...Typography.bodySmall, color: Colors.danger, textAlign: 'center' },
  errorLink: { alignItems: 'center', marginTop: 4 },
  errorLinkText: { ...Typography.label, color: Colors.primary, fontSize: 13 },
  errorText: { ...Typography.bodySmall, color: Colors.danger, marginTop: Spacing.sm, textAlign: 'center' },

  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { ...Typography.label, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  flipCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, minHeight: 140 },
  cardFront: { gap: Spacing.sm },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qNum: { backgroundColor: Colors.primary + '15', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  qNumText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  tapHint: { ...Typography.caption, color: Colors.textMuted },
  question: { ...Typography.label, color: Colors.text, lineHeight: 22 },
  whyAsked: { ...Typography.bodySmall, color: Colors.textMuted, lineHeight: 18 },
  cardBack: { gap: Spacing.sm },
  answerLabel: { ...Typography.caption, color: Colors.secondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  answerText: { ...Typography.body, color: Colors.text, lineHeight: 22 },
  tapHintBack: { ...Typography.caption, color: Colors.textMuted, textAlign: 'right' },

  techCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  techHeader: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm },
  topicBadge: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  topicText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  diffBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { ...Typography.caption, fontWeight: '700' },
  techQuestion: { ...Typography.label, color: Colors.text, lineHeight: 22 },
});
