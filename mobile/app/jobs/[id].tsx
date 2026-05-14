import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

const LABEL: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Intern',
  entry: 'Entry', mid: 'Mid', senior: 'Senior', lead: 'Lead',
  onsite: 'Onsite', remote: 'Remote', hybrid: 'Hybrid',
};

function matchColor(score: number | null) {
  if (score == null) return Colors.textMuted;
  if (score >= 80) return Colors.matchHigh;
  if (score >= 60) return Colors.matchMid;
  return Colors.matchLow;
}

function matchLabel(score: number | null) {
  if (score == null) return 'Unknown match';
  if (score >= 80) return 'Strong match';
  if (score >= 60) return 'Good match';
  return 'Weak match';
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api.get(`/jobs/${id}`).then((r) => r.data),
  });

  const { mutate: toggleSave, isPending: isSaving } = useMutation({
    mutationFn: () => job?.is_saved ? api.delete(`/jobs/${id}/save`) : api.post(`/jobs/${id}/save`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const { mutate: apply, isPending: isApplying } = useMutation({
    mutationFn: () => api.post('/applications', { job_id: id }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      router.push(`/applications/${res.data.id}`);
    },
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (!job) return null;

  const matchDetails = job.match_details ?? {};
  const matchedSkills: string[] = matchDetails.matched_skills ?? [];
  const missingSkills: string[] = matchDetails.missing_skills ?? [];
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Hero card */}
        <View style={[styles.heroCard, Shadow.md]}>
          <View style={styles.heroTop}>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>{job.title}</Text>
              <Text style={styles.heroCompany}>{job.company}</Text>
              <Text style={styles.heroLocation}>{job.location}</Text>
            </View>
            {job.match_score != null && (
              <View style={[styles.matchBadge, { backgroundColor: matchColor(job.match_score) + '18' }]}>
                <Text style={[styles.matchScore, { color: matchColor(job.match_score) }]}>{job.match_score}%</Text>
                <Text style={[styles.matchLabel, { color: matchColor(job.match_score) }]}>{matchLabel(job.match_score)}</Text>
              </View>
            )}
          </View>

          <View style={styles.tags}>
            {[LABEL[job.job_type], LABEL[job.experience_level], LABEL[job.remote_type]].map((t) => (
              <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>

          {salary && <Text style={styles.salary}>{salary}</Text>}
        </View>

        {/* Skill match breakdown */}
        {(matchedSkills.length > 0 || missingSkills.length > 0) && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Skill Match</Text>
            {matchedSkills.length > 0 && (
              <View style={styles.skillSection}>
                <Text style={styles.skillSectionLabel}>Matched ({matchedSkills.length})</Text>
                <View style={styles.chips}>
                  {matchedSkills.map((s) => (
                    <View key={s} style={[styles.chip, styles.chipMatched]}>
                      <Text style={[styles.chipText, { color: Colors.matchHigh }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {missingSkills.length > 0 && (
              <View style={[styles.skillSection, matchedSkills.length > 0 && { marginTop: Spacing.sm }]}>
                <Text style={styles.skillSectionLabel}>Missing ({missingSkills.length})</Text>
                <View style={styles.chips}>
                  {missingSkills.map((s) => (
                    <View key={s} style={[styles.chip, styles.chipMissing]}>
                      <Text style={[styles.chipText, { color: Colors.danger }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>About the Role</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements?.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Requirements</Text>
            {job.requirements.map((req: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Required Skills */}
        {job.skills_required?.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Required Skills</Text>
            <View style={styles.chips}>
              {job.skills_required.map((s: string) => (
                <View key={s} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Actions */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>AI Tools</Text>
          <View style={styles.aiActions}>
            <TouchableOpacity style={styles.aiBtn} onPress={() => router.push(`/jobs/${id}/tailor`)}>
              <Text style={styles.aiBtnIcon}>✦</Text>
              <Text style={styles.aiBtnLabel}>Tailor Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: Colors.warning + '12' }]} onPress={() => router.push(`/jobs/${id}/interview-prep`)}>
              <Text style={styles.aiBtnIcon}>🎯</Text>
              <Text style={[styles.aiBtnLabel, { color: Colors.warning }]}>Interview Prep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: Colors.secondary + '12' }]} onPress={() => router.push(`/jobs/${id}/cover-letter`)}>
              <Text style={styles.aiBtnIcon}>✉</Text>
              <Text style={[styles.aiBtnLabel, { color: Colors.secondary }]}>Cover Letter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, Shadow.md]}>
        <TouchableOpacity style={styles.saveFooterBtn} onPress={() => toggleSave()} disabled={isSaving}>
          <Text style={[styles.saveFooterText, { color: job.is_saved ? Colors.warning : Colors.textSecondary }]}>
            {job.is_saved ? '★ Saved' : '☆ Save'}
          </Text>
        </TouchableOpacity>
        {job.external_url && (
          <TouchableOpacity style={styles.externalBtn} onPress={() => Linking.openURL(job.external_url)}>
            <Text style={styles.externalBtnText}>View on Site</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.applyBtn, isApplying && styles.applyBtnDisabled]}
          onPress={() => apply()}
          disabled={isApplying}
        >
          <Text style={styles.applyBtnText}>{isApplying ? 'Applying…' : 'Apply & Track'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)} – ${fmt(max)} ${currency} / year`;
  if (min) return `${fmt(min)}+ ${currency} / year`;
  return `Up to ${fmt(max!)} ${currency} / year`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 100 },

  heroCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  heroInfo: { flex: 1 },
  heroTitle: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  heroCompany: { ...Typography.label, color: Colors.textSecondary, marginBottom: 2 },
  heroLocation: { ...Typography.bodySmall, color: Colors.textMuted },
  matchBadge: { borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6, alignItems: 'center', minWidth: 64 },
  matchScore: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  matchLabel: { ...Typography.caption, fontWeight: '600' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  tag: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },
  salary: { ...Typography.label, color: Colors.secondary, fontWeight: '600', marginTop: 4 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  cardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.md },
  description: { ...Typography.body, color: Colors.text, lineHeight: 22 },

  skillSection: {},
  skillSectionLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  chipMatched: { backgroundColor: Colors.matchHigh + '15' },
  chipMissing: { backgroundColor: Colors.danger + '10' },
  chipText: { ...Typography.caption, fontWeight: '600' },

  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { color: Colors.primary, fontWeight: '700', fontSize: 16, lineHeight: 22 },
  bulletText: { ...Typography.body, color: Colors.text, flex: 1, lineHeight: 22 },

  skillChip: { backgroundColor: Colors.primary + '12', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  skillChipText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  aiActions: { flexDirection: 'row', gap: Spacing.sm },
  aiBtn: { flex: 1, backgroundColor: Colors.primary + '12', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  aiBtnIcon: { fontSize: 18 },
  aiBtnLabel: { ...Typography.caption, color: Colors.primary, fontWeight: '700', textAlign: 'center' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm, alignItems: 'center',
  },
  saveFooterBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 10 },
  saveFooterText: { ...Typography.label, fontWeight: '600' },
  externalBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  externalBtnText: { ...Typography.label, color: Colors.textSecondary },
  applyBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
