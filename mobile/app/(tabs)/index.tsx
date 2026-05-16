import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useResumeStore } from '@/stores/resumeStore';
import { useResumes } from '@/hooks/useResumes';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { apiClient } from '@/services/api';

interface AnalyticsSummary {
  total: number;
  by_status: Record<string, number>;
}

function getScoreColor(score: number | null): string {
  if (!score) return Colors.textMuted;
  if (score >= 80) return Colors.matchHigh;
  if (score >= 60) return Colors.matchMid;
  return Colors.matchLow;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { getPrimaryResume } = useResumeStore();
  const [appStats, setAppStats] = useState<AnalyticsSummary | null>(null);
  useResumes();

  useEffect(() => {
    apiClient.get('/analytics/dashboard')
      .then(r => setAppStats(r.data.applications))
      .catch(() => {});
  }, []);

  const primaryResume = getPrimaryResume();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const atsScore = primaryResume?.ats_score ?? null;
  const scoreColor = getScoreColor(atsScore);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getTimeOfDay()},</Text>
          <Text style={styles.greetingName}>{firstName} 👋</Text>
          <Text style={styles.greetingSub}>Here's your career overview</Text>
        </View>

        {/* Resume Health Card */}
        <TouchableOpacity
          style={[styles.card, Shadow.md]}
          onPress={() => router.push('/(tabs)/resume')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIconText}>📄</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Resume Health</Text>
              <Text style={styles.cardSub}>AI-powered analysis</Text>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </View>

          {primaryResume ? (
            <>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNumber, { color: scoreColor }]}>
                  {atsScore ?? '—'}
                </Text>
                <View style={styles.scoreRight}>
                  <Text style={styles.scoreLabel}>ATS Score</Text>
                  <Text style={[styles.scoreTier, { color: scoreColor }]}>
                    {atsScore == null ? 'Analyzing' : atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Good' : 'Needs work'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, {
                  width: `${atsScore ?? 0}%`,
                  backgroundColor: scoreColor,
                }]} />
              </View>
              {primaryResume.status === 'processing' && (
                <Text style={styles.processingText}>✦ AI is analyzing your resume…</Text>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.uploadCta}
              onPress={() => router.push('/resume/upload')}
            >
              <Text style={styles.uploadCtaText}>+ Upload resume to get started</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Applied', count: appStats?.by_status.applied ?? 0, color: Colors.primary },
            { label: 'Interview', count: appStats?.by_status.interview ?? 0, color: '#8B5CF6' },
            { label: 'Offer', count: appStats?.by_status.offer ?? 0, color: Colors.tertiary },
          ].map(({ label, count, color }) => (
            <TouchableOpacity
              key={label}
              style={[styles.statCard, Shadow.sm]}
              onPress={() => router.push('/(tabs)/applications')}
              activeOpacity={0.85}
            >
              <Text style={[styles.statCount, { color }]}>{count}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Matches Card */}
        <TouchableOpacity
          style={[styles.card, Shadow.md]}
          onPress={() => router.push('/(tabs)/jobs')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.primary + '14' }]}>
              <Text style={styles.cardIconText}>🎯</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Job Matches</Text>
              <Text style={styles.cardSub}>Personalized for your skills</Text>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </View>
          <View style={styles.matchChip}>
            <Text style={styles.matchChipText}>
              {primaryResume?.status === 'ready'
                ? 'View your top matched roles →'
                : 'Upload your resume to unlock matches'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* AI Coach Card */}
        <TouchableOpacity
          style={[styles.aiCard, Shadow.md]}
          onPress={() => router.push('/(tabs)/coach')}
          activeOpacity={0.85}
        >
          <Text style={styles.aiCardIcon}>✦</Text>
          <View style={styles.aiCardText}>
            <Text style={styles.aiCardTitle}>AI Career Coach</Text>
            <Text style={styles.aiCardSub}>Get personalized career guidance</Text>
          </View>
          <Text style={styles.aiCardChevron}>›</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },

  greetingSection: { marginBottom: Spacing.lg },
  greeting: { ...Typography.body, color: Colors.textSecondary },
  greetingName: { fontSize: 26, fontWeight: '700', color: Colors.text, lineHeight: 34, marginBottom: 4 },
  greetingSub: { ...Typography.body, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight + '50',
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  cardIconText: { fontSize: 18 },
  cardHeaderText: { flex: 1 },
  cardTitle: { ...Typography.h4, color: Colors.text },
  cardSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  cardChevron: { fontSize: 22, color: Colors.textMuted, fontWeight: '300' },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  scoreNumber: { fontSize: 48, fontWeight: '700', lineHeight: 56 },
  scoreRight: { gap: 2 },
  scoreLabel: { ...Typography.caption, color: Colors.textMuted },
  scoreTier: { ...Typography.label, fontWeight: '700' },

  progressTrack: {
    height: 8, backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: Radius.full },
  processingText: { ...Typography.caption, color: Colors.primary, marginTop: Spacing.sm },

  uploadCta: {
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center',
  },
  uploadCtaText: { ...Typography.label, color: Colors.primary },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  statCount: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  statLabel: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  matchChip: {
    backgroundColor: Colors.primaryLight + '40',
    borderRadius: Radius.full, paddingVertical: 8, paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
  },
  matchChipText: { ...Typography.caption, color: Colors.primary },

  aiCard: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  aiCardIcon: { fontSize: 22, color: Colors.textInverse, marginRight: Spacing.sm },
  aiCardText: { flex: 1 },
  aiCardTitle: { ...Typography.h4, color: Colors.textInverse },
  aiCardSub: { ...Typography.caption, color: Colors.textInverse + 'cc', marginTop: 2 },
  aiCardChevron: { fontSize: 22, color: Colors.textInverse + '80', fontWeight: '300' },
});
