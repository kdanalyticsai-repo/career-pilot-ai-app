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
  { key: 'applied',   label: 'Applied',    color: Colors.primary },
  { key: 'screening', label: 'Screening',  color: Colors.warning },
  { key: 'interview', label: 'Interview',  color: '#8B5CF6' },
  { key: 'offer',     label: 'Offer',      color: Colors.tertiary },
  { key: 'rejected',  label: 'Rejected',   color: Colors.danger },
];

function atsColor(score?: number | null): string {
  if (score == null) return Colors.textMuted;
  if (score >= 80) return Colors.matchHigh;
  if (score >= 60) return Colors.matchMid;
  return Colors.matchLow;
}

export default function InsightsTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get('/analytics/dashboard');
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[styles.emptyText, { marginTop: Spacing.sm }]}>Loading insights…</Text>
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

        {/* Application Funnel */}
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>◈</Text>
            <View>
              <Text style={styles.cardTitle}>Application Funnel</Text>
              <Text style={styles.cardSub}>{total} total applications</Text>
            </View>
          </View>
          {total === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>Start applying to jobs to see your funnel</Text>
            </View>
          ) : (
            <View style={styles.funnelBars}>
              {STATUS_CONFIG.map(({ key, label, color }) => {
                const count = apps?.by_status[key] ?? 0;
                const pct = count / maxBarValue;
                return (
                  <View key={key} style={styles.barRow}>
                    <Text style={styles.barLabel}>{label}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(pct * 100, count > 0 ? 4 : 0)}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.barCount, { color }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Response Rate */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Response Rate</Text>
          <View style={styles.rateRow}>
            <View style={[styles.rateCircle, { borderColor: atsColor(apps?.response_rate) + '40' }]}>
              <Text style={[styles.rateNumber, { color: atsColor(apps?.response_rate) }]}>
                {apps?.response_rate ?? 0}%
              </Text>
            </View>
            <View style={styles.rateInfo}>
              <Text style={styles.rateDesc}>
                {!apps?.response_rate
                  ? 'No responses yet — keep applying!'
                  : apps.response_rate >= 30
                  ? 'Great response rate! Keep it up.'
                  : 'Try tailoring your resume for each role.'}
              </Text>
              <Text style={styles.rateDetail}>
                {total} applied · {(apps?.by_status.screening ?? 0) + (apps?.by_status.interview ?? 0) + (apps?.by_status.offer ?? 0)} responded
              </Text>
            </View>
          </View>
        </View>

        {/* Resume Performance */}
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📄</Text>
            <Text style={styles.cardTitle}>Resume Performance</Text>
          </View>
          <View style={styles.statsRow}>
            <StatBox
              label="ATS Score"
              value={resume?.ats_score != null ? `${resume.ats_score}` : '—'}
              suffix="/100"
              color={atsColor(resume?.ats_score)}
              note={resume?.ats_score != null
                ? resume.ats_score >= 80 ? 'Excellent' : resume.ats_score >= 60 ? 'Good' : 'Needs work'
                : 'Not analyzed'}
            />
            <View style={styles.statDivider} />
            <StatBox
              label="Completeness"
              value={resume?.completeness_score != null ? `${resume.completeness_score}` : '—'}
              suffix="%"
              color={atsColor(resume?.completeness_score)}
              note={resume?.completeness_score != null ? 'Profile filled' : 'Upload resume'}
            />
          </View>
        </View>

        {/* Job Activity */}
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🎯</Text>
            <Text style={styles.cardTitle}>Job Activity</Text>
          </View>
          <View style={styles.statsRow}>
            <StatBox label="Saved Jobs" value={`${jobs?.saved_count ?? 0}`} color={Colors.primary} />
            <View style={styles.statDivider} />
            <StatBox label="Matches Found" value={`${jobs?.match_count ?? 0}`} color={Colors.secondary} />
            <View style={styles.statDivider} />
            <StatBox
              label="Top Match"
              value={`${jobs?.top_match_score ?? 0}`}
              suffix="%"
              color={atsColor(jobs?.top_match_score)}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
          <Text style={styles.refreshText}>↻ Refresh Insights</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, suffix, color, note }: {
  label: string; value: string; suffix?: string; color: string; note?: string;
}) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {note && <Text style={[styles.statNote, { color }]}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  cardIcon: { fontSize: 20 },
  cardTitle: { ...Typography.h4, color: Colors.text },
  cardSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyIcon: { fontSize: 36, marginBottom: Spacing.sm },
  emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center' },

  funnelBars: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barLabel: { ...Typography.caption, color: Colors.textSecondary, width: 72 },
  barTrack: {
    flex: 1, height: 10, backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.full, minWidth: 4 },
  barCount: { ...Typography.label, width: 28, textAlign: 'right', fontWeight: '700' },

  rateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  rateCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight + '30',
    borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  rateNumber: { fontSize: 20, fontWeight: '700' },
  rateInfo: { flex: 1, gap: 4 },
  rateDesc: { ...Typography.body, color: Colors.text, lineHeight: 20 },
  rateDetail: { ...Typography.caption, color: Colors.textMuted },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  statDivider: { width: 1, height: 48, backgroundColor: Colors.border, marginHorizontal: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontSize: 26, fontWeight: '700' },
  statSuffix: { ...Typography.caption, color: Colors.textMuted },
  statLabel: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center' },
  statNote: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  refreshBtn: {
    alignItems: 'center', padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '40',
    borderRadius: Radius.lg, backgroundColor: Colors.primaryLight + '20',
  },
  refreshText: { ...Typography.label, color: Colors.primary },
});
