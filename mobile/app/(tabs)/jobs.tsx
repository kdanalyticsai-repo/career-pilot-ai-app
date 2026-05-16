import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  experience_level: string;
  remote_type: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  skills_required: string[];
  match_score: number | null;
  is_saved: boolean;
  posted_at: string;
};

const JOB_TYPES = ['full_time', 'part_time', 'contract', 'internship'];
const EXP_LEVELS = ['entry', 'mid', 'senior', 'lead'];
const REMOTE_TYPES = ['onsite', 'remote', 'hybrid'];

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

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)}–${fmt(max)} ${currency}`;
  if (min) return `${fmt(min)}+ ${currency}`;
  return `Up to ${fmt(max!)} ${currency}`;
}

export default function JobsTab() {
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [jobType, setJobType] = useState<string | null>(null);
  const [expLevel, setExpLevel] = useState<string | null>(null);
  const [remoteType, setRemoteType] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (jobType) params.set('job_type', jobType);
  if (expLevel) params.set('experience_level', expLevel);
  if (remoteType) params.set('remote_type', remoteType);
  if (savedOnly) params.set('saved_only', 'true');

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['jobs', params.toString()],
    queryFn: () => api.get(`/jobs?${params.toString()}`).then((r) => r.data),
    staleTime: 60_000,
    retry: 2,
  });

  const { mutate: seedJobs } = useMutation({
    mutationFn: () => api.post('/jobs/seed'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const { mutate: syncAll } = useMutation({
    mutationFn: () => api.post('/jobs/sync-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const { mutate: computeMatches } = useMutation({
    mutationFn: () => api.post('/jobs/compute-matches'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const { mutate: toggleSave } = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      saved ? api.delete(`/jobs/${id}/save`) : api.post(`/jobs/${id}/save`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const jobs: Job[] = data?.jobs ?? [];
  const activeFilters = [jobType, expLevel, remoteType, savedOnly ? 'saved' : null].filter(Boolean).length;

  const renderJob = useCallback(({ item }: { item: Job }) => {
    const salary = formatSalary(item.salary_min, item.salary_max, item.currency);
    const score = item.match_score;
    const sColor = matchColor(score);

    return (
      <TouchableOpacity
        style={[styles.card, Shadow.sm]}
        activeOpacity={0.85}
        onPress={() => router.push(`/jobs/${item.id}`)}
      >
        <View style={styles.cardTop}>
          <View style={styles.companyAvatar}>
            <Text style={styles.companyAvatarText}>{item.company[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.company}>{item.company}</Text>
            <Text style={styles.location}>📍 {item.location}</Text>
          </View>
          <View style={styles.cardRight}>
            {score != null && (
              <View style={[styles.scoreBadge, { backgroundColor: sColor + '18', borderColor: sColor + '40', borderWidth: 1 }]}>
                <Text style={[styles.scoreText, { color: sColor }]}>{score}%</Text>
              </View>
            )}
            <TouchableOpacity hitSlop={8} onPress={() => toggleSave({ id: item.id, saved: item.is_saved })}>
              <Text style={{ fontSize: 20, color: item.is_saved ? Colors.warning : Colors.textMuted }}>
                {item.is_saved ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tags}>
          <Chip label={LABEL[item.job_type] ?? item.job_type} />
          <Chip label={LABEL[item.experience_level] ?? item.experience_level} />
          <Chip label={LABEL[item.remote_type] ?? item.remote_type}
            primary={item.remote_type === 'remote'} />
          {salary && <Chip label={salary} />}
        </View>

        {item.skills_required.length > 0 && (
          <View style={styles.skills}>
            {item.skills_required.slice(0, 4).map((s) => (
              <View key={s} style={styles.skillChip}>
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
            {item.skills_required.length > 4 && (
              <Text style={styles.moreSkills}>+{item.skills_required.length - 4}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [toggleSave]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search & Filter Bar */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs, companies…"
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilters > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilter(true)}
          >
            <Text style={[styles.filterBtnText, activeFilters > 0 && { color: Colors.primary }]}>
              {activeFilters > 0 ? `Filter (${activeFilters})` : 'Filter'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isLoading && !isError && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => syncAll()}>
              <Text style={styles.actionBtnText}>⟳ Sync Live Jobs</Text>
            </TouchableOpacity>
            {jobs.length === 0 && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => seedJobs()}>
                <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Load Samples</Text>
              </TouchableOpacity>
            )}
            {jobs.length > 0 && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => computeMatches()}>
                <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>✦ Recompute</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.emptySubtitle, { marginTop: Spacing.sm }]}>Loading jobs…</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Could not load jobs</Text>
          <Text style={[styles.emptySubtitle, { fontFamily: 'monospace', fontSize: 11, marginTop: 8, paddingHorizontal: 16 }]} selectable>
            {(error as any)?.response?.status
              ? `HTTP ${(error as any).response.status}: ${JSON.stringify((error as any).response.data)}`
              : (error as any)?.message ?? String(error)}
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No jobs found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}

      {/* Filter Sheet */}
      <Modal visible={showFilter} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilter(false)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter Jobs</Text>
            <TouchableOpacity onPress={() => {
              setJobType(null); setExpLevel(null); setRemoteType(null); setSavedOnly(false);
            }}>
              <Text style={styles.clearBtn}>Clear all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody}>
            <FilterSection label="Job Type" options={JOB_TYPES} selected={jobType} onSelect={setJobType} />
            <FilterSection label="Experience" options={EXP_LEVELS} selected={expLevel} onSelect={setExpLevel} />
            <FilterSection label="Work Mode" options={REMOTE_TYPES} selected={remoteType} onSelect={setRemoteType} />
            <TouchableOpacity style={styles.savedToggle} onPress={() => setSavedOnly(!savedOnly)}>
              <Text style={styles.savedToggleLabel}>Saved Jobs Only</Text>
              <View style={[styles.toggle, savedOnly && styles.toggleOn]}>
                <View style={[styles.toggleThumb, savedOnly && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}>
            <Text style={styles.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <View style={[styles.tag, primary && styles.tagPrimary]}>
      <Text style={[styles.tagText, primary && styles.tagTextPrimary]}>{label}</Text>
    </View>
  );
}

function FilterSection({ label, options, selected, onSelect }: {
  label: string; options: string[]; selected: string | null; onSelect: (v: string | null) => void;
}) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionLabel}>{label}</Text>
      <View style={styles.filterOptions}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.filterOption, selected === opt && styles.filterOptionSelected]}
            onPress={() => onSelect(selected === opt ? null : opt)}
          >
            <Text style={[styles.filterOptionText, selected === opt && styles.filterOptionTextSelected]}>
              {LABEL[opt] ?? opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, color: Colors.textMuted, marginRight: 6 },
  searchInput: {
    flex: 1, paddingVertical: 10,
    ...Typography.body, color: Colors.text,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primaryLight + '60', borderColor: Colors.primary },
  filterBtnText: { ...Typography.label, color: Colors.textSecondary },

  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 8, alignItems: 'center',
  },
  actionBtnOutline: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnText: { ...Typography.caption, color: Colors.textInverse, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  companyAvatar: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight + '50', alignItems: 'center', justifyContent: 'center',
  },
  companyAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  cardMeta: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  jobTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  company: { ...Typography.label, color: Colors.textSecondary },
  location: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  scoreBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, minWidth: 48, alignItems: 'center' },
  scoreText: { ...Typography.caption, fontWeight: '700' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  tag: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagPrimary: { backgroundColor: Colors.primaryLight + '40' },
  tagText: { ...Typography.caption, color: Colors.textSecondary },
  tagTextPrimary: { color: Colors.primary },

  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {
    backgroundColor: Colors.primary + '12', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  skillText: { ...Typography.caption, color: Colors.primary },
  moreSkills: { ...Typography.caption, color: Colors.textMuted, paddingVertical: 3 },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: 10, paddingHorizontal: Spacing.lg,
  },
  retryBtnText: { ...Typography.label, color: Colors.textInverse },

  sheet: { flex: 1, backgroundColor: Colors.background },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sheetTitle: { ...Typography.h3, color: Colors.text },
  clearBtn: { ...Typography.label, color: Colors.danger },
  sheetBody: { flex: 1, padding: Spacing.md },
  filterSection: { marginBottom: Spacing.lg },
  filterSectionLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterOption: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterOptionText: { ...Typography.label, color: Colors.textSecondary },
  filterOptionTextSelected: { color: Colors.textInverse },
  savedToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md,
  },
  savedToggleLabel: { ...Typography.label, color: Colors.text },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface },
  toggleThumbOn: { alignSelf: 'flex-end' },
  applyBtn: {
    margin: Spacing.md, backgroundColor: Colors.primary,
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
  },
  applyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
