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
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

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
    Alert.alert(
      'Delete Resume',
      `Delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteResume(id) },
      ]
    );
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
        <Text style={styles.title}>My Resumes</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/resume/upload')}>
          <Text style={styles.uploadBtnText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading resumes...</Text>
        </View>
      ) : resumes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No resumes yet</Text>
          <Text style={styles.emptySubtitle}>Upload your PDF resume and let AI analyze it</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/resume/upload')}>
            <Text style={styles.emptyBtnText}>Upload Resume</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.modalBox} activeOpacity={1}>
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
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { ...Typography.h3, color: Colors.text },
  uploadBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  uploadBtnText: { ...Typography.label, color: Colors.textInverse },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...Typography.body, color: Colors.textSecondary },
  list: { padding: Spacing.lg, gap: Spacing.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  emptyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
  },
  emptyBtnText: { ...Typography.label, color: Colors.textInverse },

  // Rename modal
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  modalBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.xl, width: '100%',
  },
  modalTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.lg },
  modalInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...Typography.body, color: Colors.text, marginBottom: Spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { ...Typography.label, color: Colors.textSecondary },
  saveBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...Typography.label, color: Colors.textInverse },
});
