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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Good morning, {firstName}</Text>
        <Text style={styles.subGreeting}>Here's your career overview</Text>

        {/* Resume Health Card */}
        <TouchableOpacity
          style={[styles.card, Shadow.md]}
          onPress={() => router.push('/(tabs)/resume')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📄</Text>
            <Text style={styles.cardTitle}>Resume Health</Text>
          </View>
          {primaryResume ? (
            <>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNumber}>{primaryResume.ats_score ?? '—'}</Text>
                <Text style={styles.scoreLabel}>/100 ATS Score</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${primaryResume.ats_score ?? 0}%`, backgroundColor: getScoreColor(primaryResume.ats_score) },
                  ]}
                />
              </View>
              {primaryResume.status === 'processing' && (
                <Text style={styles.processingText}>AI is analyzing your resume...</Text>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.uploadCta}
              onPress={() => router.push('/resume/upload')}
            >
              <Text style={styles.uploadCtaText}>+ Upload your resume to get started</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Job Matches Card */}
        <TouchableOpacity
          style={[styles.card, Shadow.md]}
          onPress={() => router.push('/(tabs)/jobs')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🎯</Text>
            <Text style={styles.cardTitle}>Top Matches</Text>
          </View>
          <Text style={styles.matchTeaser}>
            {primaryResume?.status === 'ready'
              ? 'Upload complete! View your personalized matches'
              : 'Upload your resume to unlock job matches'}
          </Text>
          <Text style={styles.cardLink}>View Matches →</Text>
        </TouchableOpacity>

        {/* Application Tracker Card */}
        <TouchableOpacity
          style={[styles.card, Shadow.md]}
          onPress={() => router.push('/(tabs)/applications')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>Applications</Text>
          </View>
          <View style={styles.funnelRow}>
            {[
              { label: 'Applied', count: appStats?.by_status.applied ?? 0, color: Colors.primary },
              { label: 'Interview', count: appStats?.by_status.interview ?? 0, color: Colors.warning },
              { label: 'Offer', count: appStats?.by_status.offer ?? 0, color: Colors.success },
            ].map(({ label, count, color }) => (
              <View key={label} style={styles.funnelItem}>
                <Text style={[styles.funnelCount, { color }]}>{count}</Text>
                <Text style={styles.funnelLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getScoreColor(score: number | null): string {
  if (!score) return Colors.textMuted;
  if (score >= 80) return Colors.matchHigh;
  if (score >= 60) return Colors.matchMid;
  return Colors.matchLow;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  greeting: { ...Typography.h2, color: Colors.text, marginBottom: 4 },
  subGreeting: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  cardIcon: { fontSize: 20 },
  cardTitle: { ...Typography.h4, color: Colors.text },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: Spacing.sm },
  scoreNumber: { fontSize: 36, fontWeight: '700', color: Colors.text },
  scoreLabel: { ...Typography.body, color: Colors.textSecondary },
  progressBar: { height: 8, backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.full },
  processingText: { ...Typography.bodySmall, color: Colors.primary, marginTop: Spacing.sm },
  uploadCta: {
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center',
  },
  uploadCtaText: { ...Typography.label, color: Colors.primary },
  matchTeaser: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  cardLink: { ...Typography.label, color: Colors.primary },
  funnelRow: { flexDirection: 'row', justifyContent: 'space-around' },
  funnelItem: { alignItems: 'center', gap: 4 },
  funnelCount: { fontSize: 28, fontWeight: '700' },
  funnelLabel: { ...Typography.bodySmall, color: Colors.textSecondary },
});
