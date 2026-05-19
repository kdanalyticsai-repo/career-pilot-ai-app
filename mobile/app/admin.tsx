import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <View style={[statStyles.card, Shadow.sm]}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, color ? { color } : {}]}>{value}</Text>
      {sub ? <Text style={statStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  label: { ...Typography.caption, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { ...Typography.h2, color: Colors.text },
  sub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});

export default function AdminScreen() {
  const { logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await logout();
    router.replace('/role-select' as any);
  };

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
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to delete listing.');
    },
  });

  const { mutate: deleteUser, isPending: deletingUser } = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to delete user.');
    },
  });

  const { mutate: purgeAll, isPending: purging } = useMutation({
    mutationFn: () => api.delete('/admin/purge-test-data?confirm=yes'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      const d = res.data.deleted;
      Alert.alert(
        'Purge Complete',
        `Deleted ${d.users} users, ${d.resumes} resumes, ${d.applications} applications.`,
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.detail ?? 'Purge failed.');
    },
  });

  const confirmDeleteJob = (job: any) => {
    Alert.alert(
      'Delete Listing',
      `Permanently delete "${job.title}" by ${job.provider_name ?? job.provider_email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteJob(job.id) },
      ],
    );
  };

  const confirmDeleteUser = (user: any) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${user.name ?? user.email}?\n\nThis will also remove their resumes, applications, and all associated data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteUser(user.id) },
      ],
    );
  };

  const confirmPurgeAll = () => {
    Alert.alert(
      '⚠️ Purge All Test Data',
      'This will permanently delete ALL non-admin users and their resumes, applications, and saved jobs.\n\nThis cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Everything', style: 'destructive', onPress: () => purgeAll() },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchUsers(), refetchPending(), refetchProviderJobs()]);
    setRefreshing(false);
  };

  const pendingJobs: any[] = pendingJobsData ?? [];
  const providerJobs: any[] = providerJobsData ?? [];

  if (statsLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (statsError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorIcon}>🔒</Text>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorBody}>Your account does not have admin privileges. Please contact the system administrator.</Text>
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
  const applications = stats?.applications ?? {};
  const resumes = stats?.resumes ?? {};
  const recentUsers: any[] = usersData?.users ?? [];

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
            {refreshing
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={styles.refreshIcon}>↻</Text>}
          </TouchableOpacity>
        </View>

        {/* Users */}
        <Text style={styles.sectionLabel}>USERS</Text>
        <View style={styles.row}>
          <StatCard label="Total" value={u.total ?? 0} />
          <StatCard label="Free" value={u.free ?? 0} color={Colors.textSecondary} />
          <StatCard label="Pro" value={u.pro ?? 0} color={Colors.primary} />
        </View>
        <View style={[styles.singleCard, Shadow.sm]}>
          <Text style={styles.singleLabel}>New Signups (last 7 days)</Text>
          <Text style={[styles.singleValue, { color: Colors.tertiary }]}>+{u.signups_last_7d ?? 0}</Text>
        </View>

        {/* Revenue */}
        <Text style={styles.sectionLabel}>REVENUE</Text>
        <View style={styles.row}>
          <StatCard
            label="Est. MRR"
            value={`₹${(rev.monthly_inr ?? 0).toLocaleString('en-IN')}`}
            sub="Based on pro users × ₹199"
          />
          <StatCard label="Pro Subs" value={rev.pro_subscribers ?? 0} color={Colors.primary} />
        </View>

        {/* Activity */}
        <Text style={styles.sectionLabel}>ACTIVITY</Text>
        <View style={styles.row}>
          <StatCard label="Active Jobs" value={jobs.total_active ?? 0} />
          <StatCard label="Applications" value={applications.total ?? 0} />
          <StatCard label="Resumes" value={resumes.total ?? 0} />
        </View>

        {/* Pending Jobs */}
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
              const status = job.review_status ?? 'pending';
              const statusColor =
                status === 'approved' ? Colors.tertiary :
                status === 'rejected' ? Colors.danger :
                Colors.warning;
              const statusLabel =
                status === 'approved' ? 'LIVE' :
                status === 'rejected' ? 'REJECTED' :
                'PENDING';
              return (
                <View
                  key={job.id}
                  style={[styles.userRow, i < providerJobs.length - 1 && styles.userRowBorder]}
                >
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{job.title}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{job.company} · {job.location}</Text>
                    <Text style={styles.userDate}>By {job.provider_name ?? job.provider_email}</Text>
                  </View>
                  <View style={styles.userRowActions}>
                    <View style={[styles.planChip, { backgroundColor: statusColor + '18' }]}>
                      <Text style={[styles.planChipText, { color: statusColor, fontWeight: '700' }]}>{statusLabel}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => confirmDeleteJob(job)}
                      disabled={deletingJob}
                    >
                      <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Recent signups */}
        <Text style={styles.sectionLabel}>RECENT SIGNUPS</Text>
        <View style={[styles.listCard, Shadow.sm]}>
          {usersLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} />
          ) : recentUsers.length === 0 ? (
            <Text style={styles.emptyText}>No users yet</Text>
          ) : (
            recentUsers.map((user: any, i: number) => (
              <View
                key={user.id}
                style={[styles.userRow, i < recentUsers.length - 1 && styles.userRowBorder]}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(user.name ?? user.email ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{user.name ?? '(no name)'}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                  <Text style={styles.userDate}>
                    Joined {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.userRowActions}>
                  <View style={[styles.planChip, user.subscription === 'pro' && styles.planChipPro]}>
                    <Text style={[styles.planChipText, user.subscription === 'pro' && styles.planChipTextPro]}>
                      {user.subscription === 'pro' ? 'PRO' : 'FREE'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDeleteUser(user)}
                    disabled={deletingUser}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionLabel, { color: Colors.danger }]}>DANGER ZONE</Text>
        <View style={[styles.dangerCard, Shadow.sm]}>
          <View style={styles.dangerRow}>
            <View style={styles.userInfo}>
              <Text style={styles.dangerTitle}>Purge All Test Data</Text>
              <Text style={styles.dangerDesc}>Permanently delete all non-admin users and their resumes, applications, and saved jobs.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.dangerActionBtn, purging && { opacity: 0.6 }]}
            onPress={confirmPurgeAll}
            disabled={purging}
          >
            {purging
              ? <ActivityIndicator size="small" color={Colors.danger} />
              : <Text style={styles.dangerActionText}>Delete All Users</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Pull to refresh · Data is live from backend</Text>
      </ScrollView>

      {/* Job Review Modal */}
      <Modal visible={!!selectedJob} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedJob(null)}>
        {selectedJob && (
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[Typography.h3, { color: Colors.text }]}>Review Listing</Text>
                <TouchableOpacity onPress={() => setSelectedJob(null)}>
                  <Text style={{ fontSize: 24, color: Colors.textMuted }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md, gap: Spacing.sm }]}>
                <Text style={[Typography.h4, { color: Colors.text }]}>{selectedJob.title}</Text>
                <Text style={[Typography.body, { color: Colors.textSecondary }]}>{selectedJob.company} · {selectedJob.location}</Text>
                <Text style={[Typography.caption, { color: Colors.textMuted }]}>
                  {selectedJob.job_type?.replace('_', '-')} · {selectedJob.experience_level} · {selectedJob.remote_type}
                </Text>
                {selectedJob.salary_min && selectedJob.salary_max
                  ? <Text style={[Typography.caption, { color: Colors.textMuted }]}>₹{(selectedJob.salary_min/1000).toFixed(0)}k–{(selectedJob.salary_max/1000).toFixed(0)}k/yr</Text>
                  : null}
              </View>

              {selectedJob.skills_required?.length > 0 && (
                <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md }]}>
                  <Text style={[Typography.caption, { color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Skills</Text>
                  <Text style={[Typography.body, { color: Colors.text }]}>{selectedJob.skills_required.join(', ')}</Text>
                </View>
              )}

              <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md }]}>
                <Text style={[Typography.caption, { color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Description</Text>
                <Text style={[Typography.body, { color: Colors.text, lineHeight: 22 }]}>{selectedJob.description}</Text>
              </View>

              <View style={[styles.listCard, Shadow.sm, { padding: Spacing.md }]}>
                <Text style={[Typography.caption, { color: Colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Posted by</Text>
                <Text style={[Typography.label, { color: Colors.text }]}>{selectedJob.provider_name}</Text>
                <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>{selectedJob.provider_email}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: Colors.tertiary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' }}
                  onPress={() => approveJob(selectedJob.id)}
                >
                  <Text style={[Typography.label, { color: Colors.textInverse }]}>Approve & Go Live</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, borderWidth: 1.5, borderColor: Colors.danger + '60', borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.danger + '08' }}
                  onPress={() => rejectJob(selectedJob.id)}
                >
                  <Text style={[Typography.label, { color: Colors.danger }]}>Reject</Text>
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
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: Spacing.xs, marginBottom: 2,
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
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { ...Typography.label, color: Colors.text },
  userEmail: { ...Typography.bodySmall, color: Colors.textSecondary },
  userDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  userRowActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  planChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  planChipPro: { backgroundColor: Colors.primary + '15' },
  planChipText: { ...Typography.caption, color: Colors.textMuted, letterSpacing: 0.3 },
  planChipTextPro: { color: Colors.primary },
  deleteBtn: {
    width: 32, height: 32, borderRadius: Radius.sm,
    backgroundColor: Colors.danger + '10',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 14 },

  dangerCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.danger + '40', overflow: 'hidden',
    padding: Spacing.md, gap: Spacing.md,
  },
  dangerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dangerTitle: { ...Typography.label, color: Colors.danger },
  dangerDesc: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  dangerActionBtn: {
    borderWidth: 1.5, borderColor: Colors.danger + '60',
    borderRadius: Radius.md, paddingVertical: 12,
    alignItems: 'center', backgroundColor: Colors.danger + '08',
  },
  dangerActionText: { ...Typography.label, color: Colors.danger },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  errorIcon: { fontSize: 48 },
  errorTitle: { ...Typography.h3, color: Colors.text },
  errorBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  backBtnText: { ...Typography.label, color: Colors.textInverse },

  footer: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
});
