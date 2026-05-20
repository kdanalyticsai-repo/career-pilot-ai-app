import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

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

  const { data: job, isLoading, isError, refetch } = useQuery({
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
  if (isError || !job) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.textSecondary, marginBottom: 12 }}>Failed to load job details.</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: Colors.primary, fontWeight: '600' }}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const matchDetails = job.match_details ?? {};
  const matchedSkills: string[] = matchDetails.matched_skills ?? [];
  const missingSkills: string[] = matchDetails.missing_skills ?? [];
  const salary = formatSalary(job.salary_min, job.salary_max, job.currency);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>

        {/* Hero card */}
        <View style={[styles.heroCard, Shadow.md]}>
          <View style={styles.heroOrb} />
          <View style={styles.heroTop}>
            <View style={styles.companyAvatar}>
              <Text style={styles.companyAvatarText}>{job.company?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>{job.title}</Text>
              <Text style={styles.heroCompany}>{job.company}</Text>
              <Text style={styles.heroLocation}>{job.location}</Text>
            </View>
            {job.match_score != null && (
              <View style={[styles.matchBadge, { backgroundColor: matchColor(job.match_score) + '25' }]}>
                <Text style={[styles.matchScore, { color: matchColor(job.match_score) }]}>{job.match_score}%</Text>
                <Text style={[styles.matchLabel, { color: matchColor(job.match_score) }]}>{matchLabel(job.match_score)}</Text>
              </View>
            )}
          </View>

          <View style={styles.tags}>
            {[LABEL[job.job_type], LABEL[job.experience_level], LABEL[job.remote_type]].filter(Boolean).map((t) => (
              <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>

          {salary && (
            <View style={styles.salaryRow}>
              <Text style={styles.salaryIcon}>₹</Text>
              <Text style={styles.salary}>{salary}</Text>
            </View>
          )}
        </View>

        {/* Skill match breakdown */}
        {(matchedSkills.length > 0 || missingSkills.length > 0) && (
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>🎯</Text>
              </View>
              <Text style={styles.cardTitle}>Skill Match</Text>
            </View>
            {matchedSkills.length > 0 && (
              <View style={styles.skillSection}>
                <Text style={styles.skillSectionLabel}>✓ Matched ({matchedSkills.length})</Text>
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
                <Text style={[styles.skillSectionLabel, { color: Colors.danger }]}>✕ Missing ({missingSkills.length})</Text>
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
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>📋</Text>
            </View>
            <Text style={styles.cardTitle}>About the Role</Text>
          </View>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements?.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>📌</Text>
              </View>
              <Text style={styles.cardTitle}>Requirements</Text>
            </View>
            {job.requirements.map((req: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{req}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Required Skills */}
        {job.skills_required?.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>⚡</Text>
              </View>
              <Text style={styles.cardTitle}>Required Skills</Text>
            </View>
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
        <View style={[styles.aiCard, Shadow.sm]}>
          <View style={styles.aiCardHeader}>
            <Text style={styles.aiCardIcon}>✦</Text>
            <Text style={styles.aiCardTitle}>AI Tools</Text>
          </View>
          <View style={styles.aiActions}>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }]} onPress={() => router.push(`/jobs/${id}/tailor`)}>
              <Text style={styles.aiBtnIcon}>✂️</Text>
              <Text style={[styles.aiBtnLabel, { color: Colors.primary }]}>Tailor Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: Colors.tertiaryBright + '15', borderColor: Colors.tertiaryBright + '40' }]} onPress={() => router.push(`/jobs/${id}/interview-prep`)}>
              <Text style={styles.aiBtnIcon}>🎤</Text>
              <Text style={[styles.aiBtnLabel, { color: Colors.tertiary }]}>Interview Prep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: Colors.secondary + '15', borderColor: Colors.secondary + '40' }]} onPress={() => router.push(`/jobs/${id}/cover-letter`)}>
              <Text style={styles.aiBtnIcon}>✉️</Text>
              <Text style={[styles.aiBtnLabel, { color: Colors.secondary }]}>Cover Letter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, Shadow.md]}>
        <Text style={styles.applyNote}>
          Apply on the original platform first, then mark it here to track your progress.
        </Text>
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.saveFooterBtn} onPress={() => toggleSave()} disabled={isSaving}>
            <Text style={[styles.saveFooterText, { color: job.is_saved ? Colors.warning : Colors.textSecondary }]}>
              {job.is_saved ? '★ Saved' : '☆ Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewOriginalBtn, !job.external_url && styles.viewOriginalBtnDisabled]}
            onPress={() => job.external_url && Linking.openURL(job.external_url)}
            disabled={!job.external_url}
          >
            <Text style={[styles.viewOriginalBtnText, !job.external_url && { color: Colors.textMuted }]}>
              View Original
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyBtn, Shadow.sm, isApplying && styles.applyBtnDisabled]}
            onPress={() => apply()}
            disabled={isApplying}
          >
            <Text style={styles.applyBtnText}>{isApplying ? 'Tracking…' : 'Apply & Track'}</Text>
          </TouchableOpacity>
        </View>
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
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.md },

  heroCard: {
    backgroundColor: HeroColors.base, borderRadius: Radius.xl,
    padding: Spacing.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
  },
  heroOrb: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.primary, opacity: 0.35, top: -60, right: -30,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm },
  companyAvatar: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: HeroColors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  companyAvatarText: { fontSize: 20, fontWeight: '700', color: Colors.textInverse },
  heroInfo: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: HeroColors.text, marginBottom: 4, letterSpacing: -0.2 },
  heroCompany: { ...Typography.label, color: HeroColors.textDim, marginBottom: 2 },
  heroLocation: { ...Typography.caption, color: 'rgba(255,255,255,0.45)' },
  matchBadge: {
    borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6,
    alignItems: 'center', minWidth: 60,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  matchScore: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  matchLabel: { ...Typography.caption, fontWeight: '600', marginTop: 1 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  tagText: { ...Typography.caption, color: HeroColors.textDim, fontWeight: '600' },
  salaryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  salaryIcon: { fontSize: 12, color: Colors.tertiaryBright, fontWeight: '700' },
  salary: { ...Typography.label, color: Colors.tertiaryBright, fontWeight: '700' },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  cardIconWrap: {
    width: 32, height: 32, borderRadius: Radius.sm + 2,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIcon: { fontSize: 15 },
  cardTitle: { ...Typography.h4, color: Colors.text },
  description: { ...Typography.body, color: Colors.text, lineHeight: 22 },

  skillSection: {},
  skillSectionLabel: { ...Typography.caption, color: Colors.matchHigh, fontWeight: '700', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  chipMatched: { backgroundColor: Colors.matchHigh + '12', borderColor: Colors.matchHigh + '30' },
  chipMissing: { backgroundColor: Colors.danger + '10', borderColor: Colors.danger + '25' },
  chipText: { ...Typography.caption, fontWeight: '600' },

  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 8, flexShrink: 0 },
  bulletText: { ...Typography.body, color: Colors.text, flex: 1, lineHeight: 22 },

  skillChip: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  skillChipText: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '600' },

  aiCard: {
    backgroundColor: HeroColors.base, borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)', overflow: 'hidden',
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  aiCardIcon: { fontSize: 18, color: Colors.tertiaryBright },
  aiCardTitle: { ...Typography.h4, color: HeroColors.text },
  aiActions: { flexDirection: 'row', gap: Spacing.sm },
  aiBtn: {
    flex: 1, borderRadius: Radius.md, padding: Spacing.sm,
    alignItems: 'center', gap: 6, borderWidth: 1,
  },
  aiBtnIcon: { fontSize: 18 },
  aiBtnLabel: { ...Typography.caption, fontWeight: '700', textAlign: 'center' },

  footer: {
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    padding: Spacing.md, gap: Spacing.sm,
  },
  applyNote: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginBottom: 4 },
  footerButtons: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  saveFooterBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 10 },
  saveFooterText: { ...Typography.label, fontWeight: '700' },
  viewOriginalBtn: {
    flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center',
  },
  viewOriginalBtnDisabled: { borderColor: Colors.border },
  viewOriginalBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '600' },
  applyBtn: { flex: 1.4, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.md, alignItems: 'center' },
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
