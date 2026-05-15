import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { apiClient } from '@/services/api';

interface DashboardData {
  applications: {
    total: number;
    by_status: Record<string, number>;
    response_rate: number;
  };
  resume: {
    ats_score: number | null;
    completeness_score: number | null;
  };
  jobs: {
    saved_count: number;
    match_count: number;
    top_match_score: number;
  };
}

const STATUS_CONFIG = [
  { key: 'applied', label: 'Applied', color: Colors.primary },
  { key: 'screening', label: 'Screening', color: Colors.warning },
  { key: 'interview', label: 'Interview', color: '#8B5CF6' },
  { key: 'offer', label: 'Offer', color: Colors.success },
  { key: 'rejected', label: 'Rejected', color: Colors.danger },
];

export default function InsightsTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/analytics/dashboard');
      setData(res.data);
    } catch {
      // silently fail - show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const apps = data?.applications;
  const resume = data?.resume;
  const jobs = data?.jobs;
  const total = apps?.total ?? 0;
  const maxBarValue = total > 0 ? total : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Career Insights</Text>

        {/* Application Funnel */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Application Funnel</Text>
          <Text style={styles.cardSub}>{total} total applications</Text>
          {total === 0 ? (
            <Text style={styles.emptyNote}>Start applying to jobs to see your funnel</Text>
          ) : (
            STATUS_CONFIG.map(({ key, label, color }) => {
              const count = apps?.by_status[key] ?? 0;
              const pct = count / maxBarValue;
              return (
                <View key={key} style={styles.barRow}>
                  <Text style={styles.barLabel}>{label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.barCount, { color }]}>{count}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Response Rate */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Response Rate</Text>
          <View style={styles.rateRow}>
            <View style={styles.rateCircle}>
              <Text style={styles.rateNumber}>{apps?.response_rate ?? 0}%</Text>
            </View>
            <View style={styles.rateInfo}>
              <Text style={styles.rateDesc}>
                {apps?.response_rate === 0
                  ? 'No responses yet — keep applying!'
                  : apps?.response_rate && apps.response_rate >= 30
                  ? 'Great response rate! Keep it up.'
                  : 'Try tailoring your resume for each role.'}
              </Text>
              <Text style={styles.rateDetail}>
                {total} applied · {(apps?.by_status.screening ?? 0) + (apps?.by_status.interview ?? 0) + (apps?.by_status.offer ?? 0)} responded
              </Text>
            </View>
          </View>
        </View>

        {/* Resume Stats */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Resume Performance</Text>
          <View style={styles.statsRow}>
            <StatBox
              label="ATS Score"
              value={resume?.ats_score != null ? `${resume.ats_score}` : '—'}
              suffix="/100"
              color={atsColor(resume?.ats_score)}
            />
            <StatBox
              label="Completeness"
              value={resume?.completeness_score != null ? `${resume.completeness_score}` : '—'}
              suffix="%"
              color={Colors.secondary}
            />
          </View>
        </View>

        {/* Job Stats */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Job Activity</Text>
          <View style={styles.statsRow}>
            <StatBox label="Saved Jobs" value={`${jobs?.saved_count ?? 0}`} color={Colors.primary} />
            <StatBox label="Matches Found" value={`${jobs?.match_count ?? 0}`} color={Colors.secondary} />
            <StatBox
              label="Top Match"
              value={`${jobs?.top_match_score ?? 0}`}
              suffix="%"
              color={atsColor(jobs?.top_match_score)}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetch}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, suffix, color }: { label: string; value: string; suffix?: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function atsColor(score?: number | null): string {
  if (score == null) return Colors.textMuted;
  if (score >= 80) return Colors.matchHigh;
  if (score >= 60) return Colors.matchMid;
  return Colors.matchLow;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  cardTitle: { ...Typography.h4, color: Colors.text, marginBottom: 4 },
  cardSub: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.md },
  emptyNote: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 8 },
  barLabel: { ...Typography.bodySmall, color: Colors.textSecondary, width: 70 },
  barTrack: { flex: 1, height: 10, backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.full, minWidth: 4 },
  barCount: { ...Typography.label, width: 28, textAlign: 'right' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  rateCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  rateNumber: { ...Typography.h3, color: Colors.primary },
  rateInfo: { flex: 1 },
  rateDesc: { ...Typography.body, color: Colors.text, marginBottom: 4 },
  rateDetail: { ...Typography.bodySmall, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  statBox: {
    flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statSuffix: { ...Typography.bodySmall, color: Colors.textSecondary },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  refreshBtn: {
    alignItems: 'center', padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
  },
  refreshText: { ...Typography.label, color: Colors.textSecondary },
});
