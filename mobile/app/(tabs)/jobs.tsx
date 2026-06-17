import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, Linking, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
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

type SavedSearch = {
  id: string;
  name: string;
  q: string | null;
  location: string | null;
  skills: string | null;
  job_type: string | null;
  experience_level: string | null;
  remote_type: string | null;
  min_salary: number | null;
};

const JOB_TYPES = ['full_time', 'part_time', 'contract', 'internship'];
const EXP_LEVELS = ['entry', 'mid', 'senior', 'lead'];
const REMOTE_TYPES = ['onsite', 'remote', 'hybrid'];
const SALARY_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any', value: null },
  { label: '5L+', value: 500000 },
  { label: '10L+', value: 1000000 },
  { label: '15L+', value: 1500000 },
  { label: '20L+', value: 2000000 },
];
const POSTED_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Any time', value: null },
  { label: 'Last 24h', value: 1 },
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
];
const QUICK_COMPANIES = ['TCS', 'HCL', 'IBM', 'Havells', 'Tata Power'];

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

function matchBg(score: number | null) {
  if (score == null) return Colors.backgroundDim;
  if (score >= 80) return Colors.matchHigh + '18';
  if (score >= 60) return Colors.matchMid + '18';
  return Colors.matchLow + '18';
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
  const [locationFilter, setLocationFilter] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [minSalary, setMinSalary] = useState<number | null>(null);
  const [postedWithinDays, setPostedWithinDays] = useState<number | null>(null);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = !!user?.email && user.email === process.env.EXPO_PUBLIC_ADMIN_EMAIL;

  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (locationFilter.trim()) params.set('location', locationFilter.trim());
  if (skillsFilter.trim()) params.set('skills', skillsFilter.trim());
  if (jobType) params.set('job_type', jobType);
  if (expLevel) params.set('experience_level', expLevel);
  if (remoteType) params.set('remote_type', remoteType);
  if (savedOnly) params.set('saved_only', 'true');
  if (minSalary) params.set('min_salary', String(minSalary));
  if (postedWithinDays) params.set('posted_within_days', String(postedWithinDays));

  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['jobs', params.toString()],
    queryFn: () => api.get(`/jobs?${params.toString()}`).then((r) => r.data),
    staleTime: 60_000,
    retry: 2,
  });

  const { data: resumesData } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.get('/resumes').then((r) => r.data),
    staleTime: 60_000,
  });
  const hasResume = (resumesData?.resumes?.length ?? 0) > 0;

  const { mutate: seedJobs } = useMutation({
    mutationFn: () => api.post('/jobs/seed'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const { mutate: syncAll, isPending: isSyncing } = useMutation({
    mutationFn: () => api.post('/jobs/sync-all'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      const added = res.data?.synced ?? 0;
      const totalInDb = res.data?.total_in_db ?? 0;
      if (added > 0) {
        Alert.alert('Sync Complete', `${added} new job${added !== 1 ? 's' : ''} added from live sources.\n\n${totalInDb.toLocaleString()} live jobs available.`);
      } else {
        Alert.alert('Up to Date', `No new jobs found — you already have the latest listings.\n\n${totalInDb.toLocaleString()} live jobs available.`);
      }
    },
    onError: () => Alert.alert('Sync Failed', 'Could not fetch live jobs. Please try again.'),
  });

  const { mutate: computeMatches, isPending: isComputing } = useMutation({
    mutationFn: () => api.post('/jobs/compute-matches'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    onError: () => {},
  });

  const { data: savedSearchesData } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: () => api.get('/jobs/saved-searches').then((r) => r.data.saved_searches),
    staleTime: 60_000,
  });
  const savedSearches: SavedSearch[] = savedSearchesData ?? [];

  const { mutate: saveSearch, isPending: isSavingSearch } = useMutation({
    mutationFn: () => api.post('/jobs/saved-searches', {
      name: saveSearchName.trim(),
      q: search.trim() || undefined,
      location: locationFilter.trim() || undefined,
      skills: skillsFilter.trim() || undefined,
      job_type: jobType || undefined,
      experience_level: expLevel || undefined,
      remote_type: remoteType || undefined,
      min_salary: minSalary || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      setShowSaveSearchModal(false);
      setSaveSearchName('');
      Alert.alert('Saved', 'You\'ll get a notification when a new job matches this search.');
    },
    onError: () => Alert.alert('Could Not Save', 'Please try again.'),
  });

  const { mutate: deleteSavedSearch } = useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/saved-searches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  const applySavedSearch = (s: SavedSearch) => {
    setSearch(s.q ?? '');
    setLocationFilter(s.location ?? '');
    setSkillsFilter(s.skills ?? '');
    setJobType(s.job_type ?? null);
    setExpLevel(s.experience_level ?? null);
    setRemoteType(s.remote_type ?? null);
    setMinSalary(s.min_salary ?? null);
  };

  const confirmDeleteSavedSearch = (s: SavedSearch) => {
    Alert.alert('Delete Alert', `Stop watching "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSavedSearch(s.id) },
    ]);
  };

  const openSaveSearchModal = () => {
    setSaveSearchName([search.trim(), locationFilter.trim()].filter(Boolean).join(' in ') || 'My job alert');
    setShowSaveSearchModal(true);
  };

  function handleRecompute() {
    if (!hasResume) {
      computeMatches();
      Alert.alert('No Resume Found', 'Match percentages cleared. Upload a resume to see personalised matches.', [
        { text: 'Upload Resume', onPress: () => router.push('/resume/upload') },
        { text: 'OK', style: 'cancel' },
      ]);
      return;
    }
    computeMatches();
  }

  const { mutate: toggleSave } = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      saved ? api.delete(`/jobs/${id}/save`) : api.post(`/jobs/${id}/save`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const jobs: Job[] = data?.jobs ?? [];
  const activeFilters = [jobType, expLevel, remoteType, savedOnly ? 'saved' : null, locationFilter.trim() || null, skillsFilter.trim() || null, minSalary, postedWithinDays].filter(Boolean).length;

  const buildSearchQuery = () => {
    const terms = [search.trim(), locationFilter.trim()].filter(Boolean).join(' ');
    return terms ? `${terms} jobs` : 'jobs in India';
  };

  // ── Web search → prefilled "log on return" flow ───────────────────────────
  const awaitingSearchReturn = useRef(false);
  const [showSearchLog, setShowSearchLog] = useState(false);
  const [slTitle, setSlTitle] = useState('');
  const [slCompany, setSlCompany] = useState('');
  const [slLocation, setSlLocation] = useState('');
  const [slUrl, setSlUrl] = useState('');
  const [slSource, setSlSource] = useState<'google' | 'duckduckgo'>('google');

  const startWebSearch = (engine: 'google' | 'duckduckgo') => {
    const url = engine === 'google'
      ? `https://www.google.com/search?q=${encodeURIComponent(buildSearchQuery())}`
      : `https://duckduckgo.com/?q=${encodeURIComponent(buildSearchQuery())}`;
    // Pre-fill what we already know so the form is ready when they return.
    setSlSource(engine);
    setSlTitle(search.trim());
    setSlLocation(locationFilter.trim());
    setSlCompany('');
    setSlUrl('');
    awaitingSearchReturn.current = true;
    Linking.openURL(url).catch(() => { awaitingSearchReturn.current = false; });
  };

  const openGoogleSearch = () => startWebSearch('google');
  const openDuckDuckGoSearch = () => startWebSearch('duckduckgo');

  // When the user comes back to the app after a web search, offer to log it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && awaitingSearchReturn.current) {
        awaitingSearchReturn.current = false;
        setShowSearchLog(true);
      }
    });
    return () => sub.remove();
  }, []);

  const { mutate: logSearchApplication, isPending: isLoggingSearch } = useMutation({
    mutationFn: () => api.post('/applications', {
      job_title: slTitle.trim(),
      company: slCompany.trim(),
      location: slLocation.trim() || undefined,
      external_url: slUrl.trim() || undefined,
      source: slSource,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setShowSearchLog(false);
      Alert.alert('Logged', 'Saved to the Apply tab — track its status there.');
    },
    onError: () => Alert.alert('Could Not Save', 'Please check the details and try again.'),
  });

  const handleSearchLogSubmit = () => {
    if (!slTitle.trim() || !slCompany.trim()) {
      Alert.alert('Missing Details', 'Job title and company are required to track an application.');
      return;
    }
    logSearchApplication();
  };

  const renderJob = useCallback(({ item }: { item: Job }) => {
    const salary = formatSalary(item.salary_min, item.salary_max, item.currency);
    const score = item.match_score;
    const sColor = matchColor(score);
    const sBg = matchBg(score);

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
              <View style={[styles.scoreBadge, { backgroundColor: sBg, borderColor: sColor + '40', borderWidth: 1 }]}>
                <Text style={[styles.scoreText, { color: sColor }]}>{score}%</Text>
                <Text style={[styles.scoreMatchLabel, { color: sColor }]}>match</Text>
              </View>
            )}
            <TouchableOpacity hitSlop={10} onPress={() => toggleSave({ id: item.id, saved: item.is_saved })}>
              <Text style={{ fontSize: 22, color: item.is_saved ? Colors.warning : Colors.border }}>
                {item.is_saved ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tags}>
          <Chip label={LABEL[item.job_type] ?? item.job_type} />
          <Chip label={LABEL[item.experience_level] ?? item.experience_level} />
          <Chip label={LABEL[item.remote_type] ?? item.remote_type} accent={item.remote_type === 'remote'} />
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.companyChipRow} contentContainerStyle={styles.companyChipRowContent}>
          {QUICK_COMPANIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.companyChip, search === c && styles.companyChipActive]}
              onPress={() => setSearch(search === c ? '' : c)}
            >
              <Text style={[styles.companyChipText, search === c && styles.companyChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {savedSearches.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.companyChipRow} contentContainerStyle={styles.companyChipRowContent}>
            {savedSearches.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.alertChip}
                onPress={() => applySavedSearch(s)}
                onLongPress={() => confirmDeleteSavedSearch(s)}
              >
                <Text style={styles.alertChipText}>🔔 {s.name}</Text>
                <TouchableOpacity hitSlop={8} onPress={() => confirmDeleteSavedSearch(s)}>
                  <Text style={styles.alertChipRemove}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {!isLoading && !isError && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, isSyncing && { opacity: 0.7 }]}
              onPress={() => syncAll()}
              disabled={isSyncing || isComputing}
            >
              {isSyncing
                ? <ActivityIndicator size="small" color={Colors.textInverse} />
                : <Text style={styles.actionBtnText}>⟳  Sync Live Jobs</Text>
              }
            </TouchableOpacity>
            {isAdmin && jobs.length === 0 && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => seedJobs()}>
                <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Load Samples</Text>
              </TouchableOpacity>
            )}
            {jobs.length > 0 && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline, isComputing && { opacity: 0.7 }]}
                onPress={handleRecompute}
                disabled={isSyncing || isComputing}
              >
                {isComputing
                  ? <ActivityIndicator size="small" color={Colors.textSecondary} />
                  : <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>✦  Recompute</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}
        {(isSyncing || isComputing) && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>
              {isSyncing ? '⟳  Syncing live jobs, please wait…' : '✦  Matching your profile with jobs…'}
            </Text>
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
          <Text style={styles.emptySubtitle}>
            {!(error as any)?.response?.status
              ? 'No internet connection. Please check your network and try again.'
              : 'Something went wrong. Please try again in a moment.'}
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
              <Text style={styles.emptySubtitle}>Try adjusting your filters, or search the web for more results</Text>
              <View style={styles.webSearchRow}>
                <TouchableOpacity style={styles.googleSearchBtn} onPress={openGoogleSearch}>
                  <Text style={styles.googleSearchBtnText}>🔍  Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.duckSearchBtn} onPress={openDuckDuckGoSearch}>
                  <Text style={styles.duckSearchBtnText}>🦆  DuckDuckGo</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.emptyHelp}>
                Tap <Text style={styles.emptyHelpBold}>Google</Text> or <Text style={styles.emptyHelpBold}>DuckDuckGo</Text> to search the web for jobs.
                When you come back, we'll help you <Text style={styles.emptyHelpBold}>log the job in one tap</Text> so you can track its
                status (Applied → Interview → Offer) in the <Text style={styles.emptyHelpBold}>Apply</Text> tab.
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Sheet */}
      <Modal visible={showFilter} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilter(false)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter Jobs</Text>
            <TouchableOpacity onPress={() => {
              setJobType(null); setExpLevel(null); setRemoteType(null);
              setSavedOnly(false); setLocationFilter(''); setSkillsFilter('');
              setMinSalary(null); setPostedWithinDays(null);
            }}>
              <Text style={styles.clearBtn}>Clear all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Location</Text>
              <TextInput
                style={styles.filterTextInput}
                placeholder="e.g. Bangalore, Mumbai, Delhi…"
                placeholderTextColor={Colors.textMuted}
                value={locationFilter}
                onChangeText={setLocationFilter}
                returnKeyType="done"
              />
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Skill</Text>
              <TextInput
                style={styles.filterTextInput}
                placeholder="e.g. python, react, java…"
                placeholderTextColor={Colors.textMuted}
                value={skillsFilter}
                onChangeText={setSkillsFilter}
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Minimum Salary</Text>
              <View style={styles.filterOptions}>
                {SALARY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.filterOption, minSalary === opt.value && styles.filterOptionSelected]}
                    onPress={() => setMinSalary(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, minSalary === opt.value && styles.filterOptionTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Posted</Text>
              <View style={styles.filterOptions}>
                {POSTED_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.filterOption, postedWithinDays === opt.value && styles.filterOptionSelected]}
                    onPress={() => setPostedWithinDays(opt.value)}
                  >
                    <Text style={[styles.filterOptionText, postedWithinDays === opt.value && styles.filterOptionTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
          <View style={styles.sheetFooter}>
            <TouchableOpacity style={styles.saveSearchBtn} onPress={openSaveSearchModal}>
              <Text style={styles.saveSearchBtnText}>🔔 Save This Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.applyBtn, styles.applyBtnFlex]} onPress={() => setShowFilter(false)}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Save Search Name Modal */}
      <Modal visible={showSaveSearchModal} transparent animationType="fade" onRequestClose={() => setShowSaveSearchModal(false)}>
        <View style={styles.saveSearchOverlay}>
          <View style={styles.saveSearchCard}>
            <Text style={styles.saveSearchTitle}>Save This Search</Text>
            <Text style={styles.saveSearchSub}>We'll notify you when a new job matches these filters.</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Name this alert"
              placeholderTextColor={Colors.textMuted}
              value={saveSearchName}
              onChangeText={setSaveSearchName}
              autoFocus
            />
            <View style={styles.saveSearchActions}>
              <TouchableOpacity onPress={() => setShowSaveSearchModal(false)}>
                <Text style={styles.saveSearchCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveSearchConfirm, isSavingSearch && { opacity: 0.7 }]}
                onPress={() => {
                  if (!saveSearchName.trim()) { Alert.alert('Name Required', 'Please give this alert a name.'); return; }
                  saveSearch();
                }}
                disabled={isSavingSearch}
              >
                {isSavingSearch
                  ? <ActivityIndicator color={Colors.textInverse} size="small" />
                  : <Text style={styles.saveSearchConfirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prefilled "log on return" after a web search */}
      <Modal visible={showSearchLog} transparent animationType="fade" onRequestClose={() => setShowSearchLog(false)}>
        <View style={styles.saveSearchOverlay}>
          <View style={styles.saveSearchCard}>
            <Text style={styles.saveSearchTitle}>Found a job? Log it</Text>
            <Text style={styles.saveSearchSub}>
              Save the job you found via {slSource === 'google' ? 'Google' : 'DuckDuckGo'} so you can track its status in the Apply tab.
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Job title *"
              placeholderTextColor={Colors.textMuted}
              value={slTitle}
              onChangeText={setSlTitle}
            />
            <TextInput
              style={[styles.fieldInput, { marginTop: Spacing.sm }]}
              placeholder="Company *"
              placeholderTextColor={Colors.textMuted}
              value={slCompany}
              onChangeText={setSlCompany}
              autoFocus
            />
            <TextInput
              style={[styles.fieldInput, { marginTop: Spacing.sm }]}
              placeholder="Location (optional)"
              placeholderTextColor={Colors.textMuted}
              value={slLocation}
              onChangeText={setSlLocation}
            />
            <TextInput
              style={[styles.fieldInput, { marginTop: Spacing.sm }]}
              placeholder="Job posting URL (optional)"
              placeholderTextColor={Colors.textMuted}
              value={slUrl}
              onChangeText={setSlUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.saveSearchActions}>
              <TouchableOpacity onPress={() => setShowSearchLog(false)}>
                <Text style={styles.saveSearchCancel}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveSearchConfirm, isLoggingSearch && { opacity: 0.7 }]}
                onPress={handleSearchLogSubmit}
                disabled={isLoggingSearch}
              >
                {isLoggingSearch
                  ? <ActivityIndicator color={Colors.textInverse} size="small" />
                  : <Text style={styles.saveSearchConfirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <View style={[styles.tag, accent && styles.tagAccent]}>
      <Text style={[styles.tagText, accent && styles.tagTextAccent]}>{label}</Text>
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
    backgroundColor: Colors.surfaceLow, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, color: Colors.textMuted, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, ...Typography.body, color: Colors.text },

  filterBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLow, borderWidth: 1.5, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primaryLight + '60', borderColor: Colors.primary },
  filterBtnText: { ...Typography.label, color: Colors.textSecondary },

  companyChipRow: { marginTop: Spacing.sm },
  companyChipRowContent: { gap: 8, paddingRight: Spacing.sm },
  companyChip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: Colors.surfaceLow,
  },
  companyChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  companyChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  companyChipTextActive: { color: Colors.primaryDark, fontWeight: '700' },

  alertChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.primary + '40', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: Colors.primaryLight + '40',
  },
  alertChipText: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '600' },
  alertChipRemove: { fontSize: 15, color: Colors.primaryDark, fontWeight: '700', paddingHorizontal: 2 },

  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  statusBanner: {
    marginTop: Spacing.sm, backgroundColor: Colors.primaryLight + '30',
    borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '25',
  },
  statusBannerText: { ...Typography.caption, color: Colors.primary, textAlign: 'center' },
  actionBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 9, alignItems: 'center',
  },
  actionBtnOutline: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  actionBtnText: { ...Typography.caption, color: Colors.textInverse, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: Spacing.sm },
  companyAvatar: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  companyAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.primaryDark },
  cardMeta: { flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  jobTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  company: { ...Typography.label, color: Colors.textSecondary },
  location: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  scoreBadge: {
    borderRadius: Radius.md, paddingHorizontal: 8, paddingVertical: 5,
    alignItems: 'center', minWidth: 52,
  },
  scoreText: { ...Typography.caption, fontWeight: '800', fontSize: 13 },
  scoreMatchLabel: { fontSize: 9, fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: Spacing.sm },
  tag: {
    backgroundColor: Colors.surfaceLow, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  tagAccent: { backgroundColor: Colors.primaryLight + '50', borderColor: Colors.primary + '30' },
  tagText: { ...Typography.caption, color: Colors.textSecondary },
  tagTextAccent: { color: Colors.primary },

  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  skillChip: {
    backgroundColor: Colors.primary + '10', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  skillText: { ...Typography.caption, color: Colors.primary },
  moreSkills: { ...Typography.caption, color: Colors.textMuted, paddingVertical: 3 },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  webSearchRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  emptyHelp: { ...Typography.caption, fontWeight: '400', color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 19, paddingHorizontal: Spacing.md },
  emptyHelpBold: { color: Colors.text, fontWeight: '700' },
  googleSearchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: Spacing.lg,
  },
  googleSearchBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
  duckSearchBtn: {
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: Spacing.lg,
  },
  duckSearchBtnText: { ...Typography.label, color: Colors.textSecondary, fontWeight: '700' },
  retryBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingVertical: 10, paddingHorizontal: Spacing.lg,
    ...Shadow.sm,
  },
  retryBtnText: { ...Typography.label, color: Colors.textInverse },

  sheet: { flex: 1, backgroundColor: Colors.background },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xs,
  },
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
  filterTextInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 11,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.surfaceLow,
  },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterOption: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  filterOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterOptionText: { ...Typography.label, color: Colors.textSecondary },
  filterOptionTextSelected: { color: Colors.textInverse },

  savedToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md,
  },
  savedToggleLabel: { ...Typography.label, color: Colors.text },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surface },
  toggleThumbOn: { alignSelf: 'flex-end' },

  applyBtn: {
    margin: Spacing.md, backgroundColor: Colors.primary,
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.md,
  },
  applyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
  applyBtnFlex: { flex: 1, margin: 0 },

  sheetFooter: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  saveSearchBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
  },
  saveSearchBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },

  saveSearchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
  saveSearchCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm },
  saveSearchTitle: { ...Typography.h4, color: Colors.text },
  saveSearchSub: { ...Typography.bodySmall, color: Colors.textMuted, lineHeight: 18, marginBottom: Spacing.xs },
  fieldInput: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 12, ...Typography.body, color: Colors.text,
  },
  saveSearchActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.sm },
  saveSearchCancel: { ...Typography.label, color: Colors.textSecondary, paddingVertical: 10, paddingHorizontal: 4 },
  saveSearchConfirm: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 10, minWidth: 70, alignItems: 'center' },
  saveSearchConfirmText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
