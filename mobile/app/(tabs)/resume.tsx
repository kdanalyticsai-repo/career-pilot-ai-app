import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResumes } from '@/hooks/useResumes';
import { ResumeCard } from '@/components/resume/ResumeCard';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function ResumeTab() {
  const { resumes, isLoading, refetch } = useResumes();
  const queryClient = useQueryClient();

  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [newName, setNewName] = useState('');

  const { mutate: deleteResume } = useMutation({
    mutationFn: (id: string) => api.delete(`/resumes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resumes'] }),
    onError: () => Alert.alert('Error', 'Could not delete resume. Please try again.'),
  });

  const { mutate: renameResume, isPending: isRenaming } = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/resumes/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      setRenameTarget(null);
    },
    onError: () => Alert.alert('Error', 'Could not rename resume. Please try again.'),
  });

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete Resume', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteResume(id) },
    ]);
  };

  const openRename = (id: string, name: string) => {
    setNewName(name);
    setRenameTarget({ id, name });
  };

  const submitRename = () => {
    if (!renameTarget || !newName.trim()) return;
    renameResume({ id: renameTarget.id, name: newName.trim() });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Resumes</Text>
          <Text style={styles.subtitle}>{resumes.length} / 5 uploads used</Text>
        </View>
        <TouchableOpacity style={[styles.uploadBtn, Shadow.sm]} onPress={() => router.push('/resume/upload')}>
          <Text style={styles.uploadBtnText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[styles.loadingText, { marginTop: Spacing.sm }]}>Loading resumes…</Text>
        </View>
      ) : resumes.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>📄</Text>
          </View>
          <Text style={styles.emptyTitle}>No resumes yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload your PDF resume and let AI analyze it for ATS compatibility and improvement tips
          </Text>
          <TouchableOpacity style={[styles.emptyBtn, Shadow.md]} onPress={() => router.push('/resume/upload')}>
            <Text style={styles.emptyBtnText}>Upload Resume</Text>
          </TouchableOpacity>
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>💡  ATS scores above 80 get 3× more callbacks</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={resumes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ResumeCard
              resume={item}
              onPress={() => router.push(`/resume/${item.id}`)}
              onDelete={() => confirmDelete(item.id, item.name)}
              onRename={() => openRename(item.id, item.name)}
            />
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListFooterComponent={
            resumes.length < 5 ? (
              <TouchableOpacity
                style={[styles.addMoreCard, Shadow.sm]}
                onPress={() => router.push('/resume/upload')}
                activeOpacity={0.85}
              >
                <Text style={styles.addMoreIcon}>+</Text>
                <Text style={styles.addMoreText}>Add another resume</Text>
                <Text style={styles.addMoreCount}>{5 - resumes.length} remaining</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Rename Modal */}
      <Modal
        visible={!!renameTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setRenameTarget(null)}>
          <TouchableOpacity style={[styles.modalBox, Shadow.lg]} activeOpacity={1}>
            <Text style={styles.modalTitle}>Rename Resume</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Resume name"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={submitRename}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRenameTarget(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!newName.trim() || isRenaming) && styles.saveBtnDisabled]}
                onPress={submitRename}
                disabled={!newName.trim() || isRenaming}
              >
                {isRenaming
                  ? <ActivityIndicator size="small" color={Colors.textInverse} />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { ...Typography.h3, color: Colors.text },
  subtitle: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  uploadBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 9,
  },
  uploadBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...Typography.body, color: Colors.textSecondary },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary + '25',
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: {
    ...Typography.body, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 14, marginBottom: Spacing.lg,
  },
  emptyBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
  tipBox: {
    backgroundColor: Colors.primaryLight + '60', borderRadius: Radius.md,
    paddingVertical: 10, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '25',
  },
  tipText: { ...Typography.caption, color: Colors.primary },

  addMoreCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  addMoreIcon: { fontSize: 24, color: Colors.primary, marginBottom: 4 },
  addMoreText: { ...Typography.label, color: Colors.primary },
  addMoreCount: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  backdrop: {
    flex: 1, backgroundColor: 'rgba(25,28,30,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  modalBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, width: '100%',
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  modalTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.lg },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    ...Typography.body, color: Colors.text, marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceLow,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { ...Typography.label, color: Colors.textSecondary },
  saveBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...Typography.label, color: Colors.textInverse },
});
