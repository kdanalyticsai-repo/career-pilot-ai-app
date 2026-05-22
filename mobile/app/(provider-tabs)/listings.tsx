import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending Review', color: Colors.warning,   bg: Colors.warning + '18'  },
  approved: { label: 'Live',           color: Colors.tertiary,  bg: Colors.tertiary + '18' },
  rejected: { label: 'Rejected',       color: Colors.danger,    bg: Colors.danger + '18'   },
};

function JobCard({ item }: { item: any }) {
  const s = STATUS_CONFIG[item.review_status] ?? STATUS_CONFIG.pending;
  return (
    <TouchableOpacity
      style={[styles.card, Shadow.sm]}
      onPress={() => router.push(`/provider/jobs/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.company}>{item.company} · {item.location}</Text>
        </View>
        <View style={styles.cardBadges}>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
          </View>
          {item.applicant_count > 0 && (
            <View style={styles.applicantBadge}>
              <Text style={styles.applicantBadgeText}>{item.applicant_count} applied</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{item.job_type?.replace('_', '-')} · {item.experience_level}</Text>
        {item.salary_min && item.salary_max
          ? <Text style={styles.metaText}>₹{(item.salary_min / 1000).toFixed(0)}k–{(item.salary_max / 1000).toFixed(0)}k/yr</Text>
          : null}
      </View>
    </TouchableOpacity>
  );
}

export default function MyListingsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['provider-jobs'],
    queryFn: () => api.get('/provider/jobs').then(r => r.data),
  });

  const jobs: any[] = data ?? [];
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicant_count ?? 0), 0);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <JobCard item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        ListHeaderComponent={totalApplicants > 0 ? (
          <View style={styles.applicantsHeader}>
            <Text style={styles.applicantsHeaderLabel}>APPLICANTS</Text>
            <View style={styles.applicantsHeaderTile}>
              <Text style={styles.applicantsHeaderCount}>{totalApplicants}</Text>
              <Text style={styles.applicantsHeaderSub}>total applied</Text>
            </View>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyBody}>Tap "Post Job" to create your first listing. It will be reviewed before going live.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  applicantsHeader: {
    alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  applicantsHeaderLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', fontSize: 11,
  },
  applicantsHeaderTile: {
    backgroundColor: Colors.primary + '12', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.sm,
    alignItems: 'center', minWidth: 100,
  },
  applicantsHeaderCount: { fontSize: 32, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  applicantsHeaderSub: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardInfo: { flex: 1 },
  cardBadges: { alignItems: 'flex-end', gap: 4 },
  jobTitle: { ...Typography.h4, color: Colors.text },
  company: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { ...Typography.caption, fontWeight: '700', letterSpacing: 0.3 },
  applicantBadge: {
    backgroundColor: Colors.primary + '12', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  applicantBadgeText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaText: { ...Typography.caption, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...Typography.h4, color: Colors.text },
  emptyBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
