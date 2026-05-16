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
  applied:   { label: 'Applied',   color: Colors.primary,   bg: Colors.primaryLight + '40' },
  screening: { label: 'Screening', color: Colors.warning,   bg: Colors.warning + '20' },
  interview: { label: 'Interview', color: '#8B5CF6',        bg: '#8B5CF620' },
  offer:     { label: 'Offer',     color: Colors.tertiary,  bg: Colors.tertiary + '20' },
  rejected:  { label: 'Rejected',  color: Colors.danger,    bg: Colors.danger + '15' },
  withdrawn: { label: 'Withdrawn', color: Colors.textMuted, bg: Colors.surfaceMid },
};

const STATUS_ORDER = ['interview', 'offer', 'screening', 'applied', 'rejected', 'withdrawn'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.textMuted, bg: Colors.surfaceMid };
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
    if (!acc[app.status]) acc[app.status] = [];
    acc[app.status].push(app);
    return acc;
  }, {});

  const sortedApps = [...apps].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.emptySubtitle, { marginTop: Spacing.sm }]}>Loading applications…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Summary Chips */}
      {apps.length > 0 && (
        <View style={styles.summaryRow}>
          {STATUS_ORDER.filter((s) => grouped[s]?.length > 0).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <View key={s} style={[styles.summaryChip, { backgroundColor: cfg.bg, borderColor: cfg.color + '30', borderWidth: 1 }]}>
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
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            activeOpacity={0.85}
            onPress={() => router.push(`/applications/${item.id}`)}
          >
            <View style={styles.cardTop}>
              <View style={styles.companyAvatar}>
                <Text style={styles.companyAvatarText}>{item.job?.company?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
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
            <Text style={styles.emptyIcon}>📋</Text>
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
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  summaryChip: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  summaryCount: { ...Typography.label, fontWeight: '700' },
  summaryLabel: { ...Typography.caption },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: 8 },
  companyAvatar: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  companyAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  cardMeta: { flex: 1 },
  jobTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  company: { ...Typography.label, color: Colors.textSecondary, marginBottom: 2 },
  appliedDate: { ...Typography.caption, color: Colors.textMuted },

  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  badgeText: { ...Typography.caption, fontWeight: '700' },

  nextActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  nextActionIcon: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  nextActionText: { ...Typography.bodySmall, color: Colors.text, flex: 1 },
  nextActionDate: { ...Typography.caption, color: Colors.textMuted },
  notes: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 6 },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  emptyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
  },
  emptyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
