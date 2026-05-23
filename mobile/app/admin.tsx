import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

// ── Stat card (clickable) ────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, onPress }: {
  label: string; value: string | number; sub?: string; color?: string; onPress?: () => void;
}) {
  const inner = (
    <View style={[statStyles.card, Shadow.sm]}>
      <Text style={statStyles.label} numberOfLines={2}>{label}</Text>
      <Text style={[statStyles.value, color ? { color } : {}]}>{value}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
      {onPress ? <Text style={statStyles.tapHint}>tap for details</Text> : null}
    </View>
  );
  return onPress
    ? <TouchableOpacity style={statStyles.wrap} onPress={onPress} activeOpacity={0.75}>{inner}</TouchableOpacity>
    : <View style={statStyles.wrap}>{inner}</View>;
}

const statStyles = StyleSheet.create({
  wrap: { flex: 1 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  label: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, lineHeight: 14 },
  value: { ...Typography.h2, color: Colors.text },
  sub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  tapHint: { fontSize: 9, color: Colors.primary, marginTop: 3, letterSpacing: 0.2 },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);         // pending job review
  const [selectedProviderJob, setSelectedProviderJob] = useState<any>(null); // listed job detail
  const [selectedUser, setSelectedUser] = useState<any>(null);       // signup detail
  const [selectedPanProvider, setSelectedPanProvider] = useState<any>(null); // PAN review
  const [selectedAccessJob, setSelectedAccessJob] = useState<any>(null);     // applicant access review
  const [statModal, setStatModal] = useState<string | null>(null);   // revenue/activity detail
  const qc = useQueryClient();

  const handleSignOut = async () => { await logout(); router.replace('/role-select' as any); };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
    retry: false,
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users?limit=50').then(r => r.data),
    retry: false,
  });

  const { data: pendingJobsData, refetch: refetchPending } = useQuery({
    queryKey: ['admin-pending-jobs'],
    queryFn: () => api.get('/admin/pending-jobs').then(r => r.data),
    retry: false,
  });

  const { data: providerJobsData, isLoading: providerJobsLoading, refetch: refetchProviderJobs } = useQuery({
    queryKey: ['admin-provider-jobs'],
    queryFn: () => api.get('/admin/provider-jobs').then(r => r.data),
    retry: false,
  });

  const { data: pendingPanData, refetch: refetchPendingPan } = useQuery({
    queryKey: ['admin-pending-pan'],
    queryFn: () => api.get('/admin/pending-pan-providers').then(r => r.data),
    retry: false,
  });

  const { data: pendingAccessData, refetch: refetchPendingAccess } = useQuery({
    queryKey: ['admin-pending-access'],
    queryFn: () => api.get('/admin/pending-applicant-access').then(r => r.data),
    retry: false,
  });

  const { mutate: approveJob } = useMutation({
    mutationFn: (jobId: string) => api.post(`/admin/jobs/${jobId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedJob(null);
      Alert.alert('Approved', 'The listing is now live on the job feed.');
    },
  });

  const { mutate: rejectJob } = useMutation({
    mutationFn: (jobId: string) => api.post(`/admin/jobs/${jobId}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedJob(null);
      Alert.alert('Rejected', 'The listing has been rejected.');
    },
  });

  const { mutate: deleteJob, isPending: deletingJob } = useMutation({
    mutationFn: (jobId: string) => api.delete(`/admin/jobs/${jobId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-provider-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-pending-jobs'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedProviderJob(null);
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to delete listing.'),
  });

  const { mutate: deleteUser, isPending: deletingUser } = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedUser(null);
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to delete user.'),
  });

  const { mutate: approvePan } = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/verify-pan`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-pan'] });
      setSelectedPanProvider(null);
      Alert.alert('PAN Verified', 'Provider has been marked as PAN verified.');
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to verify PAN.'),
  });

  const { mutate: approveAccess } = useMutation({
    mutationFn: (jobId: string) => api.post(`/admin/jobs/${jobId}/approve-applicant-access`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-access'] });
      setSelectedAccessJob(null);
      Alert.alert('Access Approved', 'The provider can now view applicant details for this listing.');
    },
    onError: () => Alert.alert('Error', 'Could not approve. Please try again.'),
  });

  const { mutate: rejectAccess } = useMutation({
    mutationFn: (jobId: string) => api.post(`/admin/jobs/${jobId}/reject-applicant-access`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-access'] });
      setSelectedAccessJob(null);
      Alert.alert('Access Rejected', 'Provider has been notified that access was not approved.');
    },
    onError: () => Alert.alert('Error', 'Could not reject. Please try again.'),
  });

  const { mutate: rejectPan } = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/reject-pan`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-pan'] });
      setSelectedPanProvider(null);
      Alert.alert('PAN Rejected', 'Provider has been notified. Their PAN has been cleared.');
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to reject PAN.'),
  });

  const confirmDeleteJob = (job: any) => {
    Alert.alert('Delete Listing', `Permanently delete "${job.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteJob(job.id) },
    ]);
  };

  const confirmDeleteUser = (user: any) => {
    Alert.alert('Delete User', `Permanently delete ${user.name ?? user.email}?\n\nThis removes all their data.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUser(user.id) },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchUsers(), refetchPending(), refetchProviderJobs(), refetchPendingPan(), refetchPendingAccess()]);
    setRefreshing(false);
  };

  const pendingJobs: any[] = pendingJobsData ?? [];
  const providerJobs: any[] = providerJobsData ?? [];
  const recentUsers: any[] = usersData?.users ?? [];
  const pendingPan: any[] = pendingPanData ?? [];
  const pendingAccess: any[] = pendingAccessData ?? [];

  if (statsLoading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} /></SafeAreaView>;
  }

  if (statsError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorIcon}>🔒</Text>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorBody}>Your account does not have admin privileges.</Text>
          <TouchableOpacity onPress={async () => { await logout(); router.replace('/role-select' as any); }} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const u = stats?.users ?? {};
  const rev = stats?.revenue ?? {};
  const jobs = stats?.jobs ?? {};
  const listed = stats?.listed_jobs ?? {};
  const applications = stats?.applications ?? {};
  const resumes = stats?.resumes ?? {};

  const proUsers = recentUsers.filter((u: any) => u.subscription === 'pro');

  const statModalContent: Record<string, React.ReactNode> = {
    mrr: (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>Estimated MRR</Text>
        <Text style={styles.modalSub}>Monthly Recurring Revenue based on active Pro subscribers</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Pro subscribers</Text><Text style={styles.detailValue}>{rev.pro_subscribers ?? 0}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Price per user</Text><Text style={styles.detailValue}>₹199/mo</Text></View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={[styles.detailLabel, { fontWeight: '700' }]}>Est. MRR</Text><Text style={[styles.detailValue, { color: Colors.primary, fontWeight: '700' }]}>₹{(rev.monthly_inr ?? 0).toLocaleString('en-IN')}</Text></View>
      </View>
    ),
    subs: (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>Pro Subscribers</Text>
        <Text style={styles.modalSub}>{proUsers.length} Pro member{proUsers.length !== 1 ? 's' : ''} found in recent signups</Text>
        {proUsers.length === 0 ? <Text style={styles.emptyText}>No Pro subscribers in recent list</Text> : proUsers.map((u: any) => {
          const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
          const expiresDate = u.pro_expires_at ? new Date(u.pro_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
          return (
            <View key={u.id} style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                <Text style={styles.detailLabel} numberOfLines={1}>{u.name ?? '(no name)'}</Text>
                <Text style={[styles.detailValue, { color: Colors.primary }]}>PRO</Text>
              </View>
              <Text style={[styles.detailLabel, { fontSize: 11, color: Colors.textMuted, fontWeight: '400' }]}>
                Joined: {joinedDate}{'  '}Expires: {expiresDate}
              </Text>
            </View>
          );
        })}
      </View>
    ),
    jobs: (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>Active Jobs</Text>
        <Text style={styles.modalSub}>Total active jobs currently visible on the feed</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Total active</Text><Text style={styles.detailValue}>{jobs.total_active ?? 0}</Text></View>
        {Object.entries(jobs.by_source ?? {}).map(([src, count]: [string, any]) => (
          <View key={src} style={styles.detailRow}><Text style={styles.detailLabel}>Source: {src}</Text><Text style={styles.detailValue}>{count}</Text></View>
        ))}
      </View>
    ),
    apps: (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>Applications</Text>
        <Text style={styles.modalSub}>Breakdown of all applications by status</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Total</Text><Text style={[styles.detailValue, { fontWeight: '700' }]}>{applications.total ?? 0}</Text></View>
        {Object.entries(applications.by_status ?? {}).map(([status, count]: [string, any]) => (
          <View key={status} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
            <Text style={styles.detailValue}>{count}</Text>
          </View>
        ))}
      </View>
    ),
    resumes: (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>Resumes</Text>
        <Text style={styles.modalSub}>Total resumes uploaded across all job seeker accounts</Text>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={styles.detailLabel}>Total resumes</Text><Text style={[styles.detailValue, { fontWeight: '700' }]}>{resumes.total ?? 0}</Text></View>
      </View>
    ),
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSignOut} style={styles.headerBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Internal — do not share</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.headerBtn} disabled={refreshing}>
            {refreshing ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.refreshIcon}>↻</Text>}
          </TouchableOpacity>
        </View>

        {/* Users */}
        <Text style={styles.sectionLabel}>USERS</Text>
        <View style={styles.row}>
          <StatCard label="Total" value={u.total ?? 0} />
          <StatCard label="Free" value={u.free ?? 0} color={Colors.textSecondary} />
          <StatCard label="Pro" value={u.pro ?? 0} color={Colors.primary} />
        </View>
        <View style={styles.row}>
          <StatCard label="Listed Jobs" value={listed.total ?? 0} />
          <StatCard label="Approved" value={listed.approved ?? 0} color={Colors.tertiary} />
          <StatCard label="Pending" value={listed.pending ?? 0} color={Colors.warning} />
        </View>
        <View style={[styles.singleCard, Shadow.sm]}>
          <Text style={styles.singleLabel}>New Signups (last 7 days)</Text>
          <Text style={[styles.singleValue, { color: Colors.tertiary }]}>+{u.signups_last_7d ?? 0}</Text>
        </View>
        <View style={[styles.singleCard, Shadow.sm]}>
          <Text style={styles.singleLabel}>New Listed Jobs (last 7 days)</Text>
          <Text style={[styles.singleValue, { color: Colors.primary }]}>+{listed.last_7d ?? 0}</Text>
        </View>

        {/* Revenue */}
        <Text style={styles.sectionLabel}>REVENUE</Text>
        <View style={styles.row}>
          <StatCard label="Est. MRR" value={`₹${(rev.monthly_inr ?? 0).toLocaleString('en-IN')}`} sub="Pro users × ₹199" onPress={() => setStatModal('mrr')} />
          <StatCard label="Pro Subs" value={rev.pro_subscribers ?? 0} color={Colors.primary} onPress={() => setStatModal('subs')} />
        </View>

        {/* Activity */}
        <Text style={styles.sectionLabel}>ACTIVITY</Text>
        <View style={styles.row}>
          <StatCard label="Active Jobs" value={jobs.total_active ?? 0} onPress={() => setStatModal('jobs')} />
          <StatCard label="Applications" value={applications.total ?? 0} onPress={() => setStatModal('apps')} />
          <StatCard label="Resumes" value={resumes.total ?? 0} onPress={() => setStatModal('resumes')} />
        </View>

        {/* Pending PAN Verification */}
        {pendingPan.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>PENDING PAN VERIFICATION ({pendingPan.length})</Text>
            <View style={[styles.listCard, Shadow.sm]}>
              {pendingPan.map((p: any, i: number) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.userRow, i < pendingPan.length - 1 && styles.userRowBorder]}
                  onPress={() => setSelectedPanProvider(p)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{(p.name ?? p.email ?? '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{p.name ?? '(no name)'}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{p.company_name ?? p.email}</Text>
                    <Text style={styles.userDate}>PAN: {p.company_pan}</Text>
                  </View>
                  <View style={[styles.planChip, { backgroundColor: Colors.warning + '15' }]}>
                    <Text style={[styles.planChipText, { color: Colors.warning }]}>REVIEW</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Pending Job Listings */}
        <Text style={styles.sectionLabel}>
          PENDING JOB LISTINGS{stats?.pending_provider_jobs > 0 ? ` (${stats.pending_provider_jobs})` : ''}
        </Text>
        <View style={[styles.listCard, Shadow.sm]}>
          {pendingJobs.length === 0 ? (
            <Text style={styles.emptyText}>No pending listings</Text>
          ) : (
            pendingJobs.map((job: any, i: number) => (
              <TouchableOpacity
                key={job.id}
                style={[styles.userRow, i < pendingJobs.length - 1 && styles.userRowBorder]}
                onPress={() => setSelectedJob(job)}
                activeOpacity={0.7}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{job.company} · {job.location}</Text>
                  <Text style={styles.userDate}>By {job.provider_name ?? job.provider_email}</Text>
                </View>
                <View style={[styles.planChip, { backgroundColor: Colors.warning + '15' }]}>
                  <Text style={[styles.planChipText, { color: Colors.warning }]}>REVIEW</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Listed Jobs */}
        <Text style={styles.sectionLabel}>LISTED JOBS ({providerJobs.length})</Text>
        <View style={[styles.listCard, Shadow.sm]}>
          {providerJobsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} />
          ) : providerJobs.length === 0 ? (
            <Text style={styles.emptyText}>No provider listings yet</Text>
          ) : (
            providerJobs.map((job: any, i: number) => {
              const statusColor = job.review_status === 'approved' ? Colors.tertiary : job.review_status === 'rejected' ? Colors.danger : Colors.warning;
              const statusLabel = job.review_status === 'approved' ? 'LIVE' : job.review_status === 'rejected' ? 'REJECTED' : 'PENDING';
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.userRow, i < providerJobs.length - 1 && styles.userRowBorder]}
                  onPress={() => setSelectedProviderJob(job)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{job.title}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{job.company} · {job.location}</Text>
                    <Text style={styles.userDate}>By {job.provider_name ?? job.provider_email}</Text>
                  </View>
                  <View style={[styles.planChip, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[styles.planChipText, { color: statusColor, fontWeight: '700' }]}>{statusLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Recent Signups */}
        <Text style={styles.sectionLabel}>RECENT SIGNUPS</Text>
        <View style={[styles.listCard, Shadow.sm]}>
          {usersLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} />
          ) : recentUsers.length === 0 ? (
            <Text style={styles.emptyText}>No users yet</Text>
          ) : (
            recentUsers.map((user: any, i: number) => (
              <TouchableOpacity
                key={user.id}
                style={[styles.userRow, i < recentUsers.length - 1 && styles.userRowBorder]}
                onPress={() => setSelectedUser(user)}
                activeOpacity={0.7}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{(user.name ?? user.email ?? '?')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{user.name ?? '(no name)'}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                  <Text style={styles.userDate}>
                    Joined {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[styles.planChip, user.subscription === 'pro' && styles.planChipPro]}>
                  <Text style={[styles.planChipText, user.subscription === 'pro' && styles.planChipTextPro]}>
                    {user.subscription === 'pro' ? 'PRO' : 'FREE'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pending Applicant Access */}
        {pendingAccess.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>PENDING APPLICANT ACCESS ({pendingAccess.length})</Text>
            <View style={[styles.listCard, Shadow.sm]}>
              {pendingAccess.map((job: any, i: number) => (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.userRow, i < pendingAccess.length - 1 && styles.userRowBorder]}
                  onPress={() => setSelectedAccessJob(job)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{job.title}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{job.company} · {job.location}</Text>
                    <Text style={styles.userDate}>By {job.provider_name ?? job.provider_email}</Text>
                  </View>
                  <View style={[styles.planChip, { backgroundColor: Colors.warning + '15' }]}>
                    <Text style={[styles.planChipText, { color: Colors.warning }]}>ACCESS</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>Pull to refresh · Tap any row or stat for details</Text>
      </ScrollView>

      {/* ── Stat Detail Modal ── */}
      <Modal visible={!!statModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStatModal(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.h3, { color: Colors.text }]}>Detail</Text>
              <TouchableOpacity onPress={() => setStatModal(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {statModal ? statModalContent[statModal] : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Pending Job Review Modal ── */}
      <Modal visible={!!selectedJob} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedJob(null)}>
        {selectedJob && (
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.h3, { color: Colors.text }]}>Review Listing</Text>
                <TouchableOpacity onPress={() => setSelectedJob(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>
              <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md, gap: Spacing.sm }]}>
                <Text style={[Typography.h4, { color: Colors.text }]}>{selectedJob.title}</Text>
                <Text style={[Typography.body, { color: Colors.textSecondary }]}>{selectedJob.company} · {selectedJob.location}</Text>
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>{selectedJob.job_type?.replace('_', '-')} · {selectedJob.experience_level} · {selectedJob.remote_type}</Text>
              </View>
              {selectedJob.skills_required?.length > 0 && (
                <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md }]}>
                  <Text style={styles.modalFieldLabel}>Skills</Text>
                  <Text style={[Typography.body, { color: Colors.text }]}>{selectedJob.skills_required.join(', ')}</Text>
                </View>
              )}
              <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md }]}>
                <Text style={styles.modalFieldLabel}>Description</Text>
                <Text style={[Typography.body, { color: Colors.text, lineHeight: 22 }]}>{selectedJob.description}</Text>
              </View>
              <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md }]}>
                <Text style={styles.modalFieldLabel}>Posted by</Text>
                <Text style={[Typography.label, { color: Colors.text }]}>{selectedJob.provider_name}</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>{selectedJob.provider_email}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => approveJob(selectedJob.id)}>
                  <Text style={styles.approveBtnText}>Approve & Go Live</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectJob(selectedJob.id)}>
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── Listed Job Detail Modal ── */}
      <Modal visible={!!selectedProviderJob} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedProviderJob(null)}>
        {selectedProviderJob && (
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.h3, { color: Colors.text }]}>Listing Detail</Text>
                <TouchableOpacity onPress={() => setSelectedProviderJob(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>
              {([
                ['Title', selectedProviderJob.title],
                ['Company', selectedProviderJob.company],
                ['Location', selectedProviderJob.location],
                ['Type', `${selectedProviderJob.job_type?.replace('_', '-')} · ${selectedProviderJob.experience_level} · ${selectedProviderJob.remote_type}`],
                ['Status', selectedProviderJob.review_status],
                ['Posted by', selectedProviderJob.provider_name ?? '(deleted user)'],
                ['Provider email', selectedProviderJob.provider_email],
                ['Posted at', selectedProviderJob.posted_at ? new Date(selectedProviderJob.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'],
              ] as [string, string][]).map(([label, value]) => (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{value ?? '—'}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.deleteBtnFull} onPress={() => confirmDeleteJob(selectedProviderJob)} disabled={deletingJob}>
                <Text style={styles.deleteBtnFullText}>{deletingJob ? 'Deleting...' : 'Delete Listing'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── User Detail Modal ── */}
      <Modal visible={!!selectedUser} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedUser(null)}>
        {selectedUser && (() => {
          const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
          const joinedDate = selectedUser.created_at ? fmt(selectedUser.created_at) : '—';

          // Trial end = joined + 7 days
          const trialEndDate = selectedUser.created_at
            ? new Date(new Date(selectedUser.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
            : null;
          const trialEndsStr = trialEndDate ? fmt(trialEndDate.toISOString()) : '—';
          const trialExpired = trialEndDate ? trialEndDate < new Date() : false;

          const isSeeker = selectedUser.role === 'job_seeker';
          const isFree = selectedUser.subscription === 'free';
          const isPro = selectedUser.subscription === 'pro';

          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
              <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
                <View style={styles.modalHeader}>
                  <Text style={[Typography.h3, { color: Colors.text }]}>User Detail</Text>
                  <TouchableOpacity onPress={() => setSelectedUser(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
                </View>

                {([
                  ['Name', selectedUser.name],
                  ['Email', selectedUser.email],
                  ['Role', selectedUser.role],
                  ['Phone', selectedUser.phone],
                  ['Subscription', selectedUser.subscription],
                  ['Joined', joinedDate],
                ] as [string, string | null][]).map(([label, value]) => value ? (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={[
                      styles.detailValue,
                      isPro && label === 'Subscription' ? { color: Colors.primary, fontWeight: '700' } : {},
                    ]}>{value}</Text>
                  </View>
                ) : null)}

                {/* Trial end — free job seekers only */}
                {isSeeker && isFree && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trial ends</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: trialExpired ? Colors.danger : Colors.tertiary,
                      }} />
                      <Text style={[styles.detailValue, { color: trialExpired ? Colors.danger : Colors.tertiary, fontWeight: '600' }]}>
                        {trialEndsStr}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Pro expiry — pro users */}
                {isPro && selectedUser.pro_expires_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pro expires</Text>
                    <Text style={[styles.detailValue, { color: Colors.primary, fontWeight: '600' }]}>
                      {fmt(selectedUser.pro_expires_at)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity style={styles.deleteBtnFull} onPress={() => confirmDeleteUser(selectedUser)} disabled={deletingUser}>
                  <Text style={styles.deleteBtnFullText}>{deletingUser ? 'Deleting...' : 'Delete User & All Data'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>

      {/* ── PAN Verification Modal ── */}
      <Modal visible={!!selectedPanProvider} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedPanProvider(null)}>
        {selectedPanProvider && (
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.h3, { color: Colors.text }]}>PAN Verification</Text>
                <TouchableOpacity onPress={() => setSelectedPanProvider(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>
              {([
                ['Provider name', selectedPanProvider.name],
                ['Email', selectedPanProvider.email],
                ['Company PAN', selectedPanProvider.company_pan],
                ['Company Reg No.', selectedPanProvider.company_reg_no],
                ['GSTIN', selectedPanProvider.gstin],
              ] as [string, string | null][]).map(([label, value]) => value ? (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={[styles.detailValue, label === 'Company PAN' ? { fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1 } : {}]}>{value}</Text>
                </View>
              ) : null)}
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => approvePan(selectedPanProvider.id)}>
                  <Text style={styles.approveBtnText}>✓ Approve PAN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectPan(selectedPanProvider.id)}>
                  <Text style={styles.rejectBtnText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── Applicant Access Modal ── */}
      <Modal visible={!!selectedAccessJob} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedAccessJob(null)}>
        {selectedAccessJob && (
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.h3, { color: Colors.text }]}>Applicant Access Request</Text>
                <TouchableOpacity onPress={() => setSelectedAccessJob(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>
              {([
                ['Job Title', selectedAccessJob.title],
                ['Company', selectedAccessJob.company],
                ['Location', selectedAccessJob.location],
                ['Provider', selectedAccessJob.provider_name],
                ['Provider Email', selectedAccessJob.provider_email],
                ['Posted at', selectedAccessJob.posted_at ? new Date(selectedAccessJob.posted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
              ] as [string, string | null][]).map(([label, value]) => value ? (
                <View key={label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ) : null)}
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => approveAccess(selectedAccessJob.id)}>
                  <Text style={styles.approveBtnText}>✓ Grant Access</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectAccess(selectedAccessJob.id)}>
                  <Text style={styles.rejectBtnText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.primary, fontWeight: '300', lineHeight: 32 },
  refreshIcon: { fontSize: 22, color: Colors.primary, fontWeight: '400' },
  title: { ...Typography.h3, color: Colors.text },
  subtitle: { ...Typography.caption, color: Colors.danger, marginTop: 2, letterSpacing: 0.3 },

  sectionLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.xs, marginBottom: 2,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },

  singleCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  singleLabel: { ...Typography.label, color: Colors.textSecondary },
  singleValue: { ...Typography.h3, color: Colors.tertiary },

  listCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle, overflow: 'hidden',
  },
  emptyText: { ...Typography.body, color: Colors.textMuted, padding: Spacing.lg, textAlign: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  userRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { ...Typography.label, color: Colors.text },
  userEmail: { ...Typography.bodySmall, color: Colors.textSecondary },
  userDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  planChip: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  planChipPro: { backgroundColor: Colors.primary + '15' },
  planChipText: { ...Typography.caption, color: Colors.textMuted, letterSpacing: 0.3 },
  planChipTextPro: { color: Colors.primary },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalClose: { fontSize: 24, color: Colors.textMuted },
  modalBody: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.borderSubtle },
  modalTitle: { ...Typography.h4, color: Colors.text },
  modalSub: { ...Typography.caption, color: Colors.textMuted, lineHeight: 16, marginBottom: Spacing.sm },
  modalFieldLabel: { ...Typography.caption, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  detailLabel: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  detailValue: { ...Typography.body, color: Colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },

  approveBtn: { flex: 1, backgroundColor: Colors.tertiary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  approveBtnText: { ...Typography.label, color: Colors.textInverse },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.danger + '60', borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.danger + '08' },
  rejectBtnText: { ...Typography.label, color: Colors.danger },
  deleteBtnFull: { borderWidth: 1.5, borderColor: Colors.danger + '60', borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.danger + '08', marginTop: Spacing.sm },
  deleteBtnFullText: { ...Typography.label, color: Colors.danger, fontWeight: '700' },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  errorIcon: { fontSize: 48 },
  errorTitle: { ...Typography.h3, color: Colors.text },
  errorBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  backBtnText: { ...Typography.label, color: Colors.textInverse },
  footer: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
});
