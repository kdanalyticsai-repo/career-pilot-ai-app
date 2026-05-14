import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

type ApplicationJob = { id: string; title: string; company: string; location: string; job_type: string };
type Application = {
  id: string;
  job_id: string;
  status: string;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  applied_at: string;
  updated_at: string;
  job: ApplicationJob | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  applied:    { label: 'Applied',     color: Colors.primary,   bg: Colors.primary + '15' },
  screening:  { label: 'Screening',   color: Colors.warning,   bg: Colors.warning + '15' },
  interview:  { label: 'Interview',   color: Colors.secondary, bg: Colors.secondary + '15' },
  offer:      { label: 'Offer',       color: Colors.matchHigh, bg: Colors.matchHigh + '15' },
  rejected:   { label: 'Rejected',    color: Colors.danger,    bg: Colors.danger + '12' },
  withdrawn:  { label: 'Withdrawn',   color: Colors.textMuted, bg: Colors.border },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.textMuted, bg: Colors.border };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApplicationsTab() {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications').then((r) => r.data),
    staleTime: 30_000,
  });

  const apps: Application[] = data?.applications ?? [];

  const grouped = apps.reduce<Record<string, Application[]>>((acc, app) => {
    const key = app.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(app);
    return acc;
  }, {});

  const statusOrder = ['interview', 'offer', 'screening', 'applied', 'rejected', 'withdrawn'];
  const sortedApps = [...apps].sort((a, b) => {
    const ai = statusOrder.indexOf(a.status);
    const bi = statusOrder.indexOf(b.status);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Summary row */}
      {apps.length > 0 && (
        <View style={styles.summaryRow}>
          {statusOrder.filter((s) => grouped[s]?.length > 0).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <View key={s} style={[styles.summaryChip, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.summaryCount, { color: cfg.color }]}>{grouped[s].length}</Text>
                <Text style={[styles.summaryLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      <FlatList
        data={sortedApps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            activeOpacity={0.85}
            onPress={() => router.push(`/applications/${item.id}`)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardMeta}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.job?.title ?? 'Unknown Job'}</Text>
                <Text style={styles.company}>{item.job?.company ?? ''}</Text>
                <Text style={styles.appliedDate}>Applied {formatDate(item.applied_at)}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            {item.next_action && (
              <View style={styles.nextActionRow}>
                <Text style={styles.nextActionIcon}>→</Text>
                <Text style={styles.nextActionText} numberOfLines={1}>{item.next_action}</Text>
                {item.next_action_date && (
                  <Text style={styles.nextActionDate}>{formatDate(item.next_action_date)}</Text>
                )}
              </View>
            )}
            {item.notes && (
              <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptySubtitle}>Find jobs in the Jobs tab and tap "Apply & Track"</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.emptyBtnText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  summaryChip: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5, alignItems: 'center', flexDirection: 'row', gap: 4 },
  summaryCount: { ...Typography.label, fontWeight: '700' },
  summaryLabel: { ...Typography.caption, fontWeight: '500' },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  cardMeta: { flex: 1, marginRight: Spacing.sm },
  jobTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  company: { ...Typography.label, color: Colors.textSecondary, marginBottom: 2 },
  appliedDate: { ...Typography.caption, color: Colors.textMuted },

  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  badgeText: { ...Typography.caption, fontWeight: '700' },

  nextActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  nextActionIcon: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  nextActionText: { ...Typography.bodySmall, color: Colors.text, flex: 1 },
  nextActionDate: { ...Typography.caption, color: Colors.textMuted },

  notes: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 6 },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  emptyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
