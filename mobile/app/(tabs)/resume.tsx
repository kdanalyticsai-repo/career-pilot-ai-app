import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResumes } from '@/hooks/useResumes';
import { ResumeCard } from '@/components/resume/ResumeCard';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export default function ResumeTab() {
  const { resumes, isLoading, refetch } = useResumes();

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
            />
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
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
});
