import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending Review', color: Colors.warning,  bg: Colors.warning + '18'  },
  approved: { label: 'Live',           color: Colors.tertiary, bg: Colors.tertiary + '18' },
  rejected: { label: 'Rejected',       color: Colors.danger,   bg: Colors.danger + '18'   },
};

type Tab = 'details' | 'applicants';

export default function ProviderJobDetailScreen() {
  const { id, initialTab } = useLocalSearchParams<{ id: string; initialTab?: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>((initialTab as Tab) ?? 'details');

  const { data: job, isLoading } = useQuery({
    queryKey: ['provider-job', id],
    queryFn: () => api.get(`/provider/jobs`).then(r =>
      (r.data as any[]).find((j: any) => j.id === id)
    ),
  });

  const accessStatus: string | null = job?.applicants_access ?? null;
  const accessGranted = accessStatus === 'approved';

  const { data: applicants = [], isLoading: appsLoading } = useQuery({
    queryKey: ['provider-job-applicants', id],
    queryFn: () => api.get(`/provider/jobs/${id}/applicants`).then(r => r.data),
    enabled: tab === 'applicants' && accessGranted,
    retry: false,
  });

  const { mutate: requestAccess, isPending: isRequesting } = useMutation({
    mutationFn: () => api.post(`/provider/jobs/${id}/request-applicant-access`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-job', id] });
      qc.invalidateQueries({ queryKey: ['provider-jobs'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not submit request. Please try again.');
    },
  });

  const { mutate: deleteJob, isPending: isDeleting } = useMutation({
    mutationFn: () => api.delete(`/provider/jobs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-jobs'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not delete listing.'),
  });

  const handleDelete = () => {
    Alert.alert('Delete Listing', 'Are you sure you want to permanently delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteJob() },
    ]);
  };

  if (isLoading || !job) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const s = STATUS_CONFIG[job.review_status] ?? STATUS_CONFIG.pending;
  const canEdit = job.review_status !== 'approved';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={[styles.headerCard, Shadow.sm]}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{job.title}</Text>
              <Text style={styles.company}>{job.company} · {job.location}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaChip}>{job.job_type?.replace('_', '-')}</Text>
            <Text style={styles.metaChip}>{job.experience_level}</Text>
            <Text style={styles.metaChip}>{job.remote_type}</Text>
            {job.salary_min && job.salary_max
              ? <Text style={styles.metaChip}>₹{(job.salary_min/1000).toFixed(0)}k–{(job.salary_max/1000).toFixed(0)}k</Text>
              : null}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['details', 'applicants'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'applicants' ? `Applicants${job.applicant_count > 0 ? ` (${job.applicant_count})` : ''}` : 'Details'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'details' && (
          <>
            {job.skills_required?.length > 0 && (
              <View style={[styles.section, Shadow.sm]}>
                <Text style={styles.sectionTitle}>Skills Required</Text>
                <View style={styles.chipRow}>
                  {job.skills_required.map((s: string, i: number) => (
                    <View key={i} style={styles.skillChip}><Text style={styles.skillText}>{s}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {job.requirements?.length > 0 && (
              <View style={[styles.section, Shadow.sm]}>
                <Text style={styles.sectionTitle}>Requirements</Text>
                {job.requirements.map((r: string, i: number) => (
                  <View key={i} style={styles.reqRow}>
                    <Text style={styles.reqBullet}>•</Text>
                    <Text style={styles.reqText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.section, Shadow.sm]}>
              <Text style={styles.sectionTitle}>Job Description</Text>
              <Text style={styles.descText}>{job.description}</Text>
            </View>

            {canEdit && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push({ pathname: '/provider/jobs/edit', params: { id } } as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editBtnText}>Edit Listing</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={isDeleting}>
                  <Text style={styles.deleteBtnText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {tab === 'applicants' && (
          <View style={[styles.section, Shadow.sm]}>
            <Text style={styles.sectionTitle}>Applicant Details</Text>
            <Text style={styles.sectionSub}>People who applied to this listing</Text>

            {/* Access not requested yet */}
            {!accessStatus && (
              <View style={styles.accessGate}>
                <View style={styles.accessGateIcon}>
                  <Text style={{ fontSize: 28 }}>🔒</Text>
                </View>
                <Text style={styles.accessGateTitle}>Admin approval required</Text>
                <Text style={styles.accessGateBody}>
                  To protect applicant privacy, viewing contact details requires a one-time approval from our admin team.
                </Text>
                {job?.review_status !== 'approved' ? (
                  <View style={styles.accessGateNotice}>
                    <Text style={styles.accessGateNoticeText}>Your listing must be approved before you can request access.</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.accessGateBtn, Shadow.sm, isRequesting && { opacity: 0.6 }]}
                    onPress={() => requestAccess()}
                    disabled={isRequesting}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.accessGateBtnText}>{isRequesting ? 'Submitting…' : 'Request Access to Applicants'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Access pending */}
            {accessStatus === 'pending' && (
              <View style={styles.accessGate}>
                <View style={[styles.accessGateIcon, { backgroundColor: Colors.warning + '20' }]}>
                  <Text style={{ fontSize: 28 }}>⏳</Text>
                </View>
                <Text style={styles.accessGateTitle}>Request under review</Text>
                <Text style={styles.accessGateBody}>
                  Your request to view applicant details is pending admin approval. You'll be notified once it's reviewed.
                </Text>
              </View>
            )}

            {/* Access rejected */}
            {accessStatus === 'rejected' && (
              <View style={styles.accessGate}>
                <View style={[styles.accessGateIcon, { backgroundColor: Colors.danger + '15' }]}>
                  <Text style={{ fontSize: 28 }}>❌</Text>
                </View>
                <Text style={[styles.accessGateTitle, { color: Colors.danger }]}>Access not approved</Text>
                <Text style={styles.accessGateBody}>
                  Your request was not approved. Please contact support at info@kdaanalytics.com for assistance.
                </Text>
              </View>
            )}

            {/* Access approved — show list */}
            {accessGranted && (
              appsLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} />
              ) : applicants.length === 0 ? (
                <Text style={styles.emptyText}>No applicants yet</Text>
              ) : (
                applicants.map((a: any) => (
                  <View key={a.application_id} style={styles.applicantRow}>
                    <View style={styles.applicantAvatar}>
                      <Text style={styles.applicantAvatarText}>
                        {(a.applicant_name ?? a.applicant_email ?? '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.applicantInfo}>
                      <Text style={styles.applicantName}>{a.applicant_name ?? '(no name)'}</Text>
                      <Text style={styles.applicantEmail}>{a.applicant_email}</Text>
                      <Text style={styles.applicantDate}>
                        Applied {new Date(a.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                ))
              )
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  headerCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle, gap: Spacing.sm,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  headerInfo: { flex: 1 },
  title: { ...Typography.h3, color: Colors.text },
  company: { ...Typography.body, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { ...Typography.caption, fontWeight: '700', letterSpacing: 0.3 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  metaChip: {
    ...Typography.caption, color: Colors.textMuted,
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },

  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 4, borderWidth: 1, borderColor: Colors.borderSubtle },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.md },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { ...Typography.label, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse },

  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle, gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  sectionSub: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  skillChip: { backgroundColor: Colors.primary + '12', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  skillText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  reqRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  reqBullet: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
  reqText: { ...Typography.body, color: Colors.text, flex: 1, lineHeight: 20 },

  descText: { ...Typography.body, color: Colors.text, lineHeight: 22 },

  actionRow: { flexDirection: 'row', gap: Spacing.md },
  editBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.primary + '60', borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.primary + '08',
  },
  editBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  deleteBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.danger + '60', borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.danger + '08',
  },
  deleteBtnText: { ...Typography.label, color: Colors.danger },

  accessGate: {
    alignItems: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  accessGateIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  accessGateTitle: { ...Typography.h4, color: Colors.text, textAlign: 'center' },
  accessGateBody: {
    ...Typography.body, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 21,
  },
  accessGateNotice: {
    backgroundColor: Colors.warning + '18', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.warning + '40',
    padding: Spacing.sm, marginTop: Spacing.xs,
  },
  accessGateNoticeText: { ...Typography.caption, color: '#B45309', textAlign: 'center' },
  accessGateBtn: {
    backgroundColor: HeroColors.base, borderRadius: Radius.lg,
    paddingVertical: 13, paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm, alignItems: 'center',
  },
  accessGateBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
  applicantRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  applicantAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  applicantAvatarText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  applicantInfo: { flex: 1 },
  applicantName: { ...Typography.label, color: Colors.text },
  applicantEmail: { ...Typography.bodySmall, color: Colors.textSecondary },
  applicantDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
});
