import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, TextInput, ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  applied:   { label: 'Applied',   color: Colors.primary,        bg: Colors.primaryLight + '50' },
  screening: { label: 'Screening', color: Colors.warning,        bg: Colors.warning + '18' },
  interview: { label: 'Interview', color: '#7c3aed',             bg: '#7c3aed20' },
  offer:     { label: 'Offer',     color: Colors.matchHigh,      bg: Colors.matchHigh + '18' },
  rejected:  { label: 'Rejected',  color: Colors.danger,         bg: Colors.danger + '12' },
  withdrawn: { label: 'Withdrawn', color: Colors.textMuted,      bg: Colors.backgroundDim },
};

const STATUS_ORDER = ['interview', 'offer', 'screening', 'applied', 'rejected', 'withdrawn'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: Colors.textMuted, bg: Colors.backgroundDim };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + '30' }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApplicationsTab() {
  const queryClient = useQueryClient();
  const [showLogModal, setShowLogModal] = useState(false);
  const [logTitle, setLogTitle] = useState('');
  const [logCompany, setLogCompany] = useState('');
  const [logLocation, setLogLocation] = useState('');
  const [logUrl, setLogUrl] = useState('');
  const [logNotes, setLogNotes] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications').then((r) => r.data),
    staleTime: 30_000,
  });

  const resetLogForm = () => {
    setLogTitle(''); setLogCompany(''); setLogLocation(''); setLogUrl(''); setLogNotes('');
  };

  const { mutate: logApplication, isPending: isLogging } = useMutation({
    mutationFn: () => api.post('/applications', {
      job_title: logTitle.trim(),
      company: logCompany.trim(),
      location: logLocation.trim() || undefined,
      external_url: logUrl.trim() || undefined,
      notes: logNotes.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setShowLogModal(false);
      resetLogForm();
    },
    onError: () => Alert.alert('Could Not Save', 'Please check the details and try again.'),
  });

  const handleLogSubmit = () => {
    if (!logTitle.trim() || !logCompany.trim()) {
      Alert.alert('Missing Details', 'Job title and company are required.');
      return;
    }
    logApplication();
  };

  const buildLogSearchQuery = () => {
    const terms = [logTitle.trim(), logCompany.trim()].filter(Boolean).join(' ');
    return terms ? `${terms} jobs` : 'jobs in India';
  };

  const searchLogOnGoogle = () => {
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(buildLogSearchQuery())}`).catch(() => {});
  };

  const searchLogOnDuckDuckGo = () => {
    Linking.openURL(`https://duckduckgo.com/?q=${encodeURIComponent(buildLogSearchQuery())}`).catch(() => {});
  };

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Applications</Text>
        <TouchableOpacity style={styles.logBtn} onPress={() => setShowLogModal(true)}>
          <Text style={styles.logBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      {apps.length > 0 && (
        <View style={styles.summaryRow}>
          {STATUS_ORDER.filter((s) => (grouped[s]?.length ?? 0) > 0).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <View key={s} style={[styles.summaryChip, { backgroundColor: cfg.bg, borderColor: cfg.color + '30' }]}>
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
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
            </View>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptySubtitle}>Find jobs in the Jobs tab and tap "Apply & Track"</Text>
            <TouchableOpacity style={[styles.emptyBtn, Shadow.md]} onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.emptyBtnText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Log External Application */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLogModal(false)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Log Application</Text>
            <TouchableOpacity onPress={() => { setShowLogModal(false); resetLogForm(); }}>
              <Text style={styles.sheetClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetHint}>
              Found a job on Google, DuckDuckGo, or elsewhere outside the app? Log it here to track its status alongside everything else.
            </Text>
            <Text style={styles.fieldLabel}>Job Title *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Electrical Engineer"
              placeholderTextColor={Colors.textMuted}
              value={logTitle}
              onChangeText={setLogTitle}
            />
            <Text style={styles.fieldLabel}>Company *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Havells India"
              placeholderTextColor={Colors.textMuted}
              value={logCompany}
              onChangeText={setLogCompany}
            />
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Noida, Uttar Pradesh"
              placeholderTextColor={Colors.textMuted}
              value={logLocation}
              onChangeText={setLogLocation}
            />
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Job Posting URL</Text>
              {(logTitle.trim() || logCompany.trim()) ? (
                <View style={styles.findLinkRow}>
                  <Text style={styles.findLinkHint}>Find it:</Text>
                  <TouchableOpacity onPress={searchLogOnGoogle}>
                    <Text style={styles.findLinkBtn}>🔍 Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={searchLogOnDuckDuckGo}>
                    <Text style={styles.findLinkBtn}>🦆 DuckDuckGo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <TextInput
              style={styles.fieldInput}
              placeholder="Paste the link to the listing"
              placeholderTextColor={Colors.textMuted}
              value={logUrl}
              onChangeText={setLogUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              placeholder="Anything you want to remember about this application…"
              placeholderTextColor={Colors.textMuted}
              value={logNotes}
              onChangeText={setLogNotes}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
          <TouchableOpacity
            style={[styles.saveLogBtn, isLogging && { opacity: 0.7 }]}
            onPress={handleLogSubmit}
            disabled={isLogging}
          >
            {isLogging
              ? <ActivityIndicator color={Colors.textInverse} />
              : <Text style={styles.saveLogBtnText}>Save Application</Text>}
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h3, color: Colors.text },
  logBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 7,
  },
  logBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  sheet: { flex: 1, backgroundColor: Colors.background },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { ...Typography.h3, color: Colors.text },
  sheetClose: { ...Typography.label, color: Colors.textSecondary },
  sheetBody: { flex: 1, padding: Spacing.lg },
  sheetHint: { ...Typography.bodySmall, color: Colors.textMuted, lineHeight: 19, marginBottom: Spacing.lg },
  fieldLabel: { ...Typography.label, color: Colors.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  findLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  findLinkHint: { ...Typography.caption, color: Colors.textMuted },
  findLinkBtn: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  fieldInput: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 12, ...Typography.body, color: Colors.text,
  },
  fieldInputMultiline: { height: 90 },
  saveLogBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md,
    alignItems: 'center', margin: Spacing.lg,
  },
  saveLogBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  summaryRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  summaryChip: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1,
  },
  summaryCount: { ...Typography.label, fontWeight: '800' },
  summaryLabel: { ...Typography.caption, fontWeight: '600' },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: 8 },
  companyAvatar: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  companyAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.primaryDark },
  cardMeta: { flex: 1 },
  jobTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  company: { ...Typography.label, color: Colors.textSecondary, marginBottom: 2 },
  appliedDate: { ...Typography.caption, color: Colors.textMuted },

  badge: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 1,
  },
  badgeText: { ...Typography.caption, fontWeight: '700' },

  nextActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
  },
  nextActionIcon: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  nextActionText: { ...Typography.bodySmall, color: Colors.text, flex: 1 },
  nextActionDate: { ...Typography.caption, color: Colors.textMuted },
  notes: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 6 },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 22 },
  emptyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 13,
  },
  emptyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
