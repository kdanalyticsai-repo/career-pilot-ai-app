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

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['jobs', params.toString()],
    queryFn: () => api.get(`/jobs?${params.toString()}`).then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: seedJobs } = useMutation({
    mutationFn: () => api.post('/jobs/seed'),
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
    return (
      <TouchableOpacity
        style={[styles.card, Shadow.sm]}
        activeOpacity={0.85}
        onPress={() => router.push(`/jobs/${item.id}`)}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardMeta}>
            <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.company}>{item.company}</Text>
            <Text style={styles.location}>{item.location}</Text>
          </View>
          <View style={styles.cardRight}>
            {item.match_score != null && (
              <View style={[styles.scoreBadge, { backgroundColor: matchColor(item.match_score) + '18' }]}>
                <Text style={[styles.scoreText, { color: matchColor(item.match_score) }]}>
                  {item.match_score}%
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.saveBtn}
              hitSlop={8}
              onPress={() => toggleSave({ id: item.id, saved: item.is_saved })}
            >
              <Text style={[styles.saveIcon, { color: item.is_saved ? Colors.warning : Colors.textMuted }]}>
                {item.is_saved ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tags}>
          <Tag label={LABEL[item.job_type] ?? item.job_type} />
          <Tag label={LABEL[item.experience_level] ?? item.experience_level} />
          <Tag label={LABEL[item.remote_type] ?? item.remote_type} color={item.remote_type === 'remote' ? Colors.secondary : undefined} />
          {salary && <Tag label={salary} />}
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, companies…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.filterBtn, activeFilters > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilter(true)}
          >
            <Text style={[styles.filterBtnText, activeFilters > 0 && { color: Colors.primary }]}>
              Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {jobs.length === 0 && !isLoading && (
          <View style={styles.seedRow}>
            <TouchableOpacity style={styles.seedBtn} onPress={() => { seedJobs(); }}>
              <Text style={styles.seedBtnText}>Load Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.seedBtn, { backgroundColor: Colors.secondary + '15' }]} onPress={() => computeMatches()}>
              <Text style={[styles.seedBtnText, { color: Colors.secondary }]}>Compute Matches</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No jobs found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters or load the job feed</Text>
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

function Tag({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[styles.tag, color ? { backgroundColor: color + '15' } : {}]}>
      <Text style={[styles.tagText, color ? { color } : {}]}>{label}</Text>
    </View>
  );
}

function FilterSection({ label, options, selected, onSelect }: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (v: string | null) => void;
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
  header: { backgroundColor: Colors.surface, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  searchInput: {
    flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.body, color: Colors.text,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary + '12', borderColor: Colors.primary },
  filterBtnText: { ...Typography.label, color: Colors.textSecondary },
  seedRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  seedBtn: { flex: 1, backgroundColor: Colors.primary + '12', borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  seedBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardMeta: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  jobTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  company: { ...Typography.label, color: Colors.textSecondary },
  location: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 2 },
  scoreBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, minWidth: 46, alignItems: 'center' },
  scoreText: { ...Typography.caption, fontWeight: '700' },
  saveBtn: { padding: 4 },
  saveIcon: { fontSize: 20 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  tag: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '500' },

  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: { backgroundColor: Colors.primary + '12', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  skillText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  moreSkills: { ...Typography.caption, color: Colors.textMuted, paddingVertical: 3 },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },

  sheet: { flex: 1, backgroundColor: Colors.background },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { ...Typography.h3, color: Colors.text },
  clearBtn: { ...Typography.label, color: Colors.danger },
  sheetBody: { flex: 1, padding: Spacing.md },
  filterSection: { marginBottom: Spacing.lg },
  filterSectionLabel: { ...Typography.label, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterOption: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border },
  filterOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterOptionText: { ...Typography.label, color: Colors.textSecondary },
  filterOptionTextSelected: { color: Colors.textInverse },
  savedToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  savedToggleLabel: { ...Typography.label, color: Colors.text },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface },
  toggleThumbOn: { alignSelf: 'flex-end' },
  applyBtn: { margin: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  applyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
