import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { API_URL } from '@/constants/config';
import { ATSScoreRing } from '@/components/resume/ATSScoreRing';
import { ScoreBreakdown } from '@/components/resume/ScoreBreakdown';
import { QuickWins } from '@/components/resume/QuickWins';

export default function ResumeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleExportPDF = () => {
    const baseUrl = API_URL.replace('/api/v1', '');
    const url = `${baseUrl}/api/v1/resumes/${id}/export-pdf`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open download link.'));
  };

  const { data: resume, isLoading } = useQuery({
    queryKey: ['resume', id],
    queryFn: () => api.get(`/resumes/${id}`).then((r) => r.data),
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' ? 3000 : false,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!resume) return null;

  const atsDetails = resume.ats_details ?? {};
  const breakdown = atsDetails.breakdown ?? {};
  const quickWins: string[] = atsDetails.quick_wins ?? [];
  const criticalIssues: string[] = atsDetails.critical_issues ?? [];
  const suggestions = atsDetails.suggestions ?? {};
  const keywordsFound: string[] = atsDetails.keywords_found ?? [];
  const keywordsMissing: string[] = atsDetails.keywords_missing ?? [];
  const isReady = resume.status === 'ready';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Before/After comparison banner */}
        {isReady && resume.prev_ats_score != null && resume.ats_score != null && (
          <View style={[styles.comparisonBanner, Shadow.sm]}>
            <Text style={styles.comparisonTitle}>Score after editing</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonBlock}>
                <Text style={styles.comparisonLabel}>Before</Text>
                <Text style={[styles.comparisonScore, { color: Colors.matchMid }]}>
                  {resume.prev_ats_score}
                </Text>
              </View>
              <Text style={styles.comparisonArrow}>→</Text>
              <View style={styles.comparisonBlock}>
                <Text style={styles.comparisonLabel}>After</Text>
                <Text style={[styles.comparisonScore, {
                  color: resume.ats_score > resume.prev_ats_score ? Colors.matchHigh : Colors.danger,
                }]}>
                  {resume.ats_score}
                </Text>
              </View>
              <View style={[styles.deltaBadge, {
                backgroundColor: resume.ats_score > resume.prev_ats_score
                  ? Colors.matchHigh + '20' : Colors.danger + '15',
              }]}>
                <Text style={[styles.deltaText, {
                  color: resume.ats_score > resume.prev_ats_score ? Colors.matchHigh : Colors.danger,
                }]}>
                  {resume.ats_score > resume.prev_ats_score ? '+' : ''}
                  {resume.ats_score - resume.prev_ats_score}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Score header */}
        <View style={[styles.scoreCard, Shadow.md]}>
          <View style={styles.scoreRow}>
            <ATSScoreRing score={isReady ? resume.ats_score : null} label="ATS Score" />
            <View style={styles.scoreMeta}>
              <Text style={styles.resumeName} numberOfLines={2}>{resume.name}</Text>
              {isReady && resume.completeness_score != null && (
                <View style={styles.completenessRow}>
                  <Text style={styles.completenessLabel}>Completeness</Text>
                  <View style={styles.completenessBg}>
                    <View style={[styles.completenessFill, { width: `${resume.completeness_score}%` }]} />
                  </View>
                  <Text style={styles.completenessVal}>{resume.completeness_score}%</Text>
                </View>
              )}
              {resume.is_primary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
              {resume.status === 'processing' && (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.processingText}>Analysing…</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Export PDF */}
        {isReady && (
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF}>
            <Text style={styles.exportBtnText}>⬇ Export PDF</Text>
          </TouchableOpacity>
        )}

        {/* Score Breakdown */}
        {isReady && Object.keys(breakdown).length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Score Breakdown</Text>
            <ScoreBreakdown breakdown={breakdown} />
          </View>
        )}

        {/* Quick Wins + Critical Issues */}
        {isReady && (quickWins.length > 0 || criticalIssues.length > 0) && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Improvements</Text>
            <QuickWins quickWins={quickWins} criticalIssues={criticalIssues} />
          </View>
        )}

        {/* Keywords */}
        {isReady && (keywordsFound.length > 0 || keywordsMissing.length > 0) && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Keywords</Text>
            {keywordsFound.length > 0 && (
              <View style={styles.keywordSection}>
                <Text style={styles.keywordLabel}>Found ({keywordsFound.length})</Text>
                <View style={styles.chips}>
                  {keywordsFound.map((kw) => (
                    <View key={kw} style={[styles.chip, styles.chipFound]}>
                      <Text style={[styles.chipText, { color: Colors.matchHigh }]}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {keywordsMissing.length > 0 && (
              <View style={[styles.keywordSection, { marginTop: Spacing.sm }]}>
                <Text style={styles.keywordLabel}>Missing ({keywordsMissing.length})</Text>
                <View style={styles.chips}>
                  {keywordsMissing.map((kw) => (
                    <View key={kw} style={[styles.chip, styles.chipMissing]}>
                      <Text style={[styles.chipText, { color: Colors.danger }]}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* AI Suggestions */}
        {isReady && Object.keys(suggestions).length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>AI Suggestions</Text>
            {Object.entries(suggestions).map(([section, tips]) => {
              const list = tips as string[];
              if (!list?.length) return null;
              return (
                <View key={section} style={styles.suggestionSection}>
                  <Text style={styles.suggestionSectionTitle}>
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </Text>
                  {list.map((tip, i) => (
                    <View key={i} style={styles.suggestionRow}>
                      <Text style={styles.suggestionBullet}>›</Text>
                      <Text style={styles.suggestionText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* Resume Sections */}
        {resume.structured_data && (
          <>
            {resume.structured_data.contact && (
              <SectionCard title="Contact" onEdit={() => router.push(`/resume/${id}/edit/contact`)}>
                <InfoRow label="Name" value={resume.structured_data.contact.name} />
                <InfoRow label="Email" value={resume.structured_data.contact.email} />
                <InfoRow label="Phone" value={resume.structured_data.contact.phone} />
                <InfoRow label="Location" value={resume.structured_data.contact.location} />
              </SectionCard>
            )}

            {resume.structured_data.experience?.length > 0 && (
              <SectionCard
                title={`Experience (${resume.structured_data.experience.length})`}
                onEdit={() => router.push(`/resume/${id}/edit/experience`)}
              >
                {resume.structured_data.experience.map((exp: Record<string, unknown>, i: number) => (
                  <View key={i} style={styles.expItem}>
                    <Text style={styles.expTitle}>{String(exp.title)} at {String(exp.company)}</Text>
                    <Text style={styles.expDate}>
                      {String(exp.start_date ?? '')} — {exp.is_current ? 'Present' : String(exp.end_date ?? '')}
                    </Text>
                    {Array.isArray(exp.bullets) && exp.bullets.slice(0, 2).map((b: unknown, j: number) => (
                      <Text key={j} style={styles.bullet}>• {String(b)}</Text>
                    ))}
                  </View>
                ))}
              </SectionCard>
            )}

            {resume.structured_data.skills?.technical?.length > 0 && (
              <SectionCard title="Technical Skills" onEdit={() => router.push(`/resume/${id}/edit/skills`)}>
                <View style={styles.skillsWrap}>
                  {resume.structured_data.skills.technical.map((skill: string) => (
                    <View key={skill} style={styles.skillChip}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>
            )}

            {resume.structured_data.summary && (
              <SectionCard title="Summary" onEdit={() => router.push(`/resume/${id}/edit/summary`)}>
                <Text style={styles.summaryText}>{resume.structured_data.summary}</Text>
              </SectionCard>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({
  title, children, onEdit,
}: {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <View style={[styles.card, Shadow.sm]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} hitSlop={8}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },

  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  scoreMeta: { flex: 1, gap: Spacing.sm },
  resumeName: { ...Typography.h4, color: Colors.text },

  completenessRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completenessLabel: { ...Typography.caption, color: Colors.textMuted, width: 82 },
  completenessBg: {
    flex: 1, height: 6, backgroundColor: Colors.border,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  completenessFill: {
    height: '100%', borderRadius: Radius.full, backgroundColor: Colors.primary,
  },
  completenessVal: { ...Typography.caption, color: Colors.primary, fontWeight: '600', width: 30 },

  primaryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  primaryBadgeText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  processingText: { ...Typography.bodySmall, color: Colors.primary },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { ...Typography.h4, color: Colors.text },
  editBtn: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },

  keywordSection: {},
  keywordLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  chipFound: { backgroundColor: Colors.matchHigh + '15' },
  chipMissing: { backgroundColor: Colors.danger + '10' },
  chipText: { ...Typography.caption, fontWeight: '600' },

  suggestionSection: { marginBottom: Spacing.sm },
  suggestionSectionTitle: { ...Typography.label, color: Colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  suggestionRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  suggestionBullet: { color: Colors.primary, fontWeight: '700', fontSize: 16, lineHeight: 20 },
  suggestionText: { ...Typography.body, color: Colors.text, flex: 1 },

  expItem: {
    marginBottom: Spacing.sm, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  expTitle: { ...Typography.label, color: Colors.text },
  expDate: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  bullet: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 3, paddingLeft: 4 },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  skillChip: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  skillText: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },

  summaryText: { ...Typography.body, color: Colors.text, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoLabel: { ...Typography.bodySmall, color: Colors.textMuted },
  infoValue: { ...Typography.bodySmall, color: Colors.text, flex: 1, textAlign: 'right' },

  comparisonBanner: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
  },
  comparisonTitle: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  comparisonBlock: { alignItems: 'center', flex: 1 },
  comparisonLabel: { ...Typography.caption, color: Colors.textMuted },
  comparisonScore: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  comparisonArrow: { fontSize: 20, color: Colors.textMuted },
  deltaBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  deltaText: { ...Typography.label, fontWeight: '700' },
  exportBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.md,
    backgroundColor: Colors.primary + '10',
  },
  exportBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '600' },
});
