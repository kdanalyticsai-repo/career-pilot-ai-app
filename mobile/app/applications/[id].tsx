import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

const STATUS_OPTIONS = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  applied:   { label: 'Applied',   color: Colors.primary,   bg: Colors.primary + '15' },
  screening: { label: 'Screening', color: Colors.warning,   bg: Colors.warning + '15' },
  interview: { label: 'Interview', color: Colors.secondary, bg: Colors.secondary + '15' },
  offer:     { label: 'Offer',     color: Colors.matchHigh, bg: Colors.matchHigh + '15' },
  rejected:  { label: 'Rejected',  color: Colors.danger,    bg: Colors.danger + '12' },
  withdrawn: { label: 'Withdrawn', color: Colors.textMuted, bg: Colors.border },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then((r) => {
      const d = r.data;
      setNotes(d.notes ?? '');
      setNextAction(d.next_action ?? '');
      return d;
    }),
  });

  const { mutate: update, isPending } = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/applications/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setEditingNotes(false);
      setShowStatusModal(false);
    },
  });

  const { mutate: deleteApp } = useMutation({
    mutationFn: () => api.delete(`/applications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      router.back();
    },
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (!app) return null;

  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.applied;
  const timeline: Array<{ status: string; timestamp: string; note?: string }> = app.timeline ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Job info */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.jobTitle}>{app.job?.title ?? 'Unknown Job'}</Text>
          <Text style={styles.company}>{app.job?.company ?? ''}</Text>
          <Text style={styles.meta}>{app.job?.location} · {app.job?.job_type?.replace('_', ' ')}</Text>
          <Text style={styles.appliedDate}>Applied {formatDate(app.applied_at)}</Text>
        </View>

        {/* Status */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.cardTitle}>Status</Text>
          <TouchableOpacity
            style={[styles.statusRow, { backgroundColor: cfg.bg }]}
            onPress={() => setShowStatusModal(true)}
          >
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={[styles.statusChevron, { color: cfg.color }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Next Action */}
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Next Action</Text>
            {!editingNotes && (
              <TouchableOpacity onPress={() => setEditingNotes(true)}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingNotes ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="e.g. Follow up email, Prepare for interview…"
                placeholderTextColor={Colors.textMuted}
                value={nextAction}
                onChangeText={setNextAction}
              />
              <Text style={styles.sectionLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add notes about this application…"
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => { setEditingNotes(false); setNotes(app.notes ?? ''); setNextAction(app.next_action ?? ''); }}>
                  <Text style={styles.cancelBtn}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isPending && { opacity: 0.6 }]}
                  onPress={() => update({ notes, next_action: nextAction || null })}
                  disabled={isPending}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {app.next_action ? (
                <Text style={styles.nextActionText}>{app.next_action}</Text>
              ) : (
                <Text style={styles.emptyText}>No next action set</Text>
              )}
              {app.notes && <Text style={styles.notesText}>{app.notes}</Text>}
            </>
          )}
        </View>

        {/* Timeline */}
        {timeline.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Timeline</Text>
            {[...timeline].reverse().map((entry, i) => {
              const entryCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.applied;
              return (
                <View key={i} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, { backgroundColor: entryCfg.color }]} />
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineStatus, { color: entryCfg.color }]}>{entryCfg.label}</Text>
                    {entry.note && <Text style={styles.timelineNote}>{entry.note}</Text>}
                    <Text style={styles.timelineDate}>{formatDateTime(entry.timestamp)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Danger zone */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteApp()}>
          <Text style={styles.deleteBtnText}>Delete Application</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Status picker modal */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Update Status</Text>
            {STATUS_OPTIONS.map((s) => {
              const c = STATUS_CONFIG[s];
              const isSelected = s === app.status;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOption, isSelected && { backgroundColor: c.bg }]}
                  onPress={() => update({ status: s })}
                >
                  <View style={[styles.statusDot, { backgroundColor: c.color }]} />
                  <Text style={[styles.statusOptionText, isSelected && { color: c.color, fontWeight: '700' }]}>{c.label}</Text>
                  {isSelected && <Text style={[styles.checkmark, { color: c.color }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.md },
  editBtn: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },

  jobTitle: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  company: { ...Typography.label, color: Colors.textSecondary, marginBottom: 2 },
  meta: { ...Typography.bodySmall, color: Colors.textMuted, marginBottom: 4 },
  appliedDate: { ...Typography.caption, color: Colors.textMuted },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.md, padding: Spacing.md },
  statusText: { ...Typography.label, fontWeight: '700' },
  statusChevron: { fontSize: 20, fontWeight: '700' },

  sectionLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, ...Typography.body, color: Colors.text, marginBottom: Spacing.sm,
  },
  notesInput: { height: 100 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.sm },
  cancelBtn: { ...Typography.label, color: Colors.textSecondary, paddingVertical: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  saveBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  nextActionText: { ...Typography.label, color: Colors.text },
  notesText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 22 },
  emptyText: { ...Typography.body, color: Colors.textMuted, fontStyle: 'italic' },

  timelineRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineContent: { flex: 1 },
  timelineStatus: { ...Typography.label, fontWeight: '600' },
  timelineNote: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  timelineDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  deleteBtn: { padding: Spacing.md, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.danger + '50' },
  deleteBtnText: { ...Typography.label, color: Colors.danger },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.lg },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, marginBottom: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { ...Typography.label, color: Colors.text, flex: 1 },
  checkmark: { fontSize: 16, fontWeight: '700' },
});
