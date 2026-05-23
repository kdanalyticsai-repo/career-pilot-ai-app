import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function AllApplicantsScreen() {
  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ['provider-jobs'],
    queryFn: () => api.get('/provider/jobs').then(r => r.data),
  });

  const jobsWithApplicants = jobs.filter(j => (j.applicant_count ?? 0) > 0);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const totalApplicants = jobsWithApplicants.reduce((sum, j) => sum + (j.applicant_count ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={jobsWithApplicants}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={totalApplicants > 0 ? (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderLabel}>APPLICANTS</Text>
            <View style={styles.sectionHeaderTile}>
              <Text style={styles.sectionHeaderCount}>{totalApplicants}</Text>
              <Text style={styles.sectionHeaderSub}>total applied</Text>
            </View>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No applicants yet</Text>
            <Text style={styles.emptyBody}>Once job seekers apply to your listings, they will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, Shadow.sm]}
            onPress={() => router.push({ pathname: `/provider/jobs/[id]`, params: { id: item.id, initialTab: 'applicants' } } as any)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.company}>{item.company} · {item.location}</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{item.applicant_count}</Text>
                <Text style={styles.countLabel}>applied</Text>
              </View>
            </View>
            <Text style={styles.viewLink}>View applicants →</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  sectionHeader: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, marginBottom: Spacing.xs },
  sectionHeaderLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', fontSize: 11,
  },
  sectionHeaderTile: {
    backgroundColor: Colors.primary + '12', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.sm, alignItems: 'center', minWidth: 100,
  },
  sectionHeaderCount: { fontSize: 32, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  sectionHeaderSub: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle, gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  cardInfo: { flex: 1 },
  jobTitle: { ...Typography.h4, color: Colors.text },
  company: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },

  countBadge: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    alignItems: 'center', minWidth: 54,
  },
  countText: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  countLabel: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  viewLink: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...Typography.h4, color: Colors.text },
  emptyBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
