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
  { key: 'interview', label: 'Interview',  color: '#7c3aed' },
  { key: 'offer',     label: 'Offer',      color: Colors.matchHigh },
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

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Could not load insights. Please try again.</Text>
          <TouchableOpacity style={[styles.refreshBtn, { marginTop: Spacing.md }]} onPress={fetchData}>
            <Text style={styles.refreshText}>Retry</Text>
          </TouchableOpacity>
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
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>◈</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Application Funnel</Text>
              <Text style={styles.cardSub}>{total} total applications</Text>
            </View>
          </View>
          {total === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
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
            <View style={[styles.rateCircle, { borderColor: atsColor(apps?.response_rate) }]}>
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
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>📄</Text>
            </View>
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
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>🎯</Text>
            </View>
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

        <TouchableOpacity style={[styles.refreshBtn, Shadow.sm]} onPress={fetchData}>
          <Text style={styles.refreshText}>↻  Refresh Insights</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  container: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.sm },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: Radius.sm + 2,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardIcon: { fontSize: 18 },
  cardTitle: { ...Typography.h4, color: Colors.text },
  cardSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center' },

  funnelBars: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barLabel: { ...Typography.caption, color: Colors.textSecondary, width: 72 },
  barTrack: {
    flex: 1, height: 10, backgroundColor: Colors.backgroundDim,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.full, minWidth: 4 },
  barCount: { ...Typography.label, width: 28, textAlign: 'right', fontWeight: '800' },

  rateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  rateCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.primaryLight + '30',
    borderWidth: 2.5,
    justifyContent: 'center', alignItems: 'center',
  },
  rateNumber: { fontSize: 22, fontWeight: '800' },
  rateInfo: { flex: 1, gap: 4 },
  rateDesc: { ...Typography.body, color: Colors.text, lineHeight: 20 },
  rateDetail: { ...Typography.caption, color: Colors.textMuted },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  statDivider: { width: 1, height: 52, backgroundColor: Colors.borderSubtle, marginHorizontal: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statSuffix: { ...Typography.caption, color: Colors.textMuted },
  statLabel: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center' },
  statNote: { fontSize: 10, fontWeight: '600', textAlign: 'center' },

  refreshBtn: {
    alignItems: 'center', padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
    borderRadius: Radius.lg, backgroundColor: Colors.primaryLight + '25',
  },
  refreshText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
});
