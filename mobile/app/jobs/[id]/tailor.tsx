import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function TailorScreen() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<any>(null);

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then((r) => r.data),
  });

  const { mutate: tailor, isPending, isError } = useMutation({
    mutationFn: () => api.post('/ai/tailor', { job_id: jobId }),
    onSuccess: (res) => setResult(res.data),
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Job context */}
        <View style={[styles.jobCard, Shadow.sm]}>
          <Text style={styles.jobTitle}>{job?.title ?? 'Loading…'}</Text>
          <Text style={styles.company}>{job?.company}</Text>
        </View>

        {!result && !isPending && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Tailor Your Resume</Text>
            <Text style={styles.cardBody}>
              Our AI will rewrite your resume summary, experience bullets, and skills order to better match this job.
              Your original resume is never changed — this creates a tailored version.
            </Text>
            <View style={styles.bullets}>
              {['Rewrite summary to match the job title', 'Strengthen experience bullets with job keywords', 'Reorder skills to highlight what matters most'].map((b) => (
                <View key={b} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>✓</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.tailorBtn} onPress={() => tailor()}>
              <Text style={styles.tailorBtnText}>Tailor Resume for This Job</Text>
            </TouchableOpacity>
            {isError && <Text style={styles.errorText}>Failed to tailor. Please try again.</Text>}
          </View>
        )}

        {isPending && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>AI is tailoring your resume…</Text>
            <Text style={styles.loadingSubtext}>This takes about 10-15 seconds</Text>
          </View>
        )}

        {result && (
          <>
            {/* Score comparison */}
            {result.ats_score_before != null && (
              <View style={[styles.scoreCard, Shadow.sm]}>
                <Text style={styles.scoreCardTitle}>Score Impact</Text>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreBlock}>
                    <Text style={styles.scoreLabel}>Before</Text>
                    <Text style={[styles.scoreNum, { color: Colors.matchMid }]}>{result.ats_score_before}</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={styles.scoreBlock}>
                    <Text style={styles.scoreLabel}>Tailored</Text>
                    <Text style={[styles.scoreNum, { color: Colors.matchHigh }]}>Est. +8–15</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Keywords added */}
            {result.keywords_added?.length > 0 && (
              <View style={[styles.card, Shadow.sm]}>
                <Text style={styles.cardTitle}>Keywords Added</Text>
                <View style={styles.chips}>
                  {result.keywords_added.map((kw: string) => (
                    <View key={kw} style={styles.chip}>
                      <Text style={styles.chipText}>+ {kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Changes per section */}
            {result.changes && (
              <View style={[styles.card, Shadow.sm]}>
                <Text style={styles.cardTitle}>What Changed</Text>
                {result.changes.summary && (
                  <ChangeRow section="Summary" change={result.changes.summary} />
                )}
                {Array.isArray(result.changes.experience) && result.changes.experience.map((c: string, i: number) => (
                  <ChangeRow key={i} section={`Experience ${i + 1}`} change={c} />
                ))}
                {result.changes.skills && (
                  <ChangeRow section="Skills" change={result.changes.skills} />
                )}
              </View>
            )}

            {/* Tailored summary */}
            {result.tailored_sections?.summary && (
              <View style={[styles.card, Shadow.sm]}>
                <Text style={styles.cardTitle}>Tailored Summary</Text>
                <View style={styles.diffBlock}>
                  <Text style={styles.diffLabel}>NEW</Text>
                  <Text style={styles.diffText}>{result.tailored_sections.summary}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChangeRow({ section, change }: { section: string; change: string }) {
  return (
    <View style={styles.changeRow}>
      <View style={styles.changeBadge}>
        <Text style={styles.changeBadgeText}>{section}</Text>
      </View>
      <Text style={styles.changeText}>{change}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  jobCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md },
  jobTitle: { ...Typography.h4, color: Colors.text },
  company: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  cardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  cardBody: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },

  bullets: { gap: 8, marginBottom: Spacing.lg },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { color: Colors.secondary, fontWeight: '700', fontSize: 14 },
  bulletText: { ...Typography.body, color: Colors.text, flex: 1 },

  tailorBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  tailorBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
  errorText: { ...Typography.bodySmall, color: Colors.danger, marginTop: Spacing.sm, textAlign: 'center' },

  loadingCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.label, color: Colors.text },
  loadingSubtext: { ...Typography.bodySmall, color: Colors.textMuted },

  scoreCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  scoreCardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  scoreBlock: { alignItems: 'center', gap: 4 },
  scoreLabel: { ...Typography.caption, color: Colors.textMuted },
  scoreNum: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  arrow: { fontSize: 22, color: Colors.textMuted },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: Colors.secondary + '15', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { ...Typography.caption, color: Colors.secondary, fontWeight: '700' },

  changeRow: { marginBottom: Spacing.md, gap: 4 },
  changeBadge: { backgroundColor: Colors.primary + '12', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  changeBadgeText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  changeText: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },

  diffBlock: { backgroundColor: Colors.secondary + '08', borderRadius: Radius.md, borderLeftWidth: 3, borderLeftColor: Colors.secondary, padding: Spacing.md },
  diffLabel: { ...Typography.caption, color: Colors.secondary, fontWeight: '700', marginBottom: 6 },
  diffText: { ...Typography.body, color: Colors.text, lineHeight: 22 },

  doneBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  doneBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
