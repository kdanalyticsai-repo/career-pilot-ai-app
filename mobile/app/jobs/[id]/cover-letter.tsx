import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Clipboard, Alert, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function CoverLetterScreen() {
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<any>(null);
  const [editedLetter, setEditedLetter] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get(`/jobs/${jobId}`).then((r) => r.data),
  });

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => api.post('/ai/cover-letter', { job_id: jobId }),
    onSuccess: (res) => {
      setResult(res.data);
      setEditedLetter(res.data.cover_letter);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 404 || (typeof detail === 'string' && detail.includes('resume'))) {
        Alert.alert('No Resume Found', 'Please upload a resume first before generating a cover letter.', [{ text: 'OK' }]);
      } else if (err?.response?.status === 403) {
        Alert.alert('Upgrade Required', 'Cover letter generation is a Pro feature. Upgrade to continue.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Generation Failed', detail || 'Could not generate cover letter. Please try again.', [{ text: 'OK' }]);
      }
    },
  });

  const handleCopy = () => {
    Clipboard.setString(editedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Job context */}
        <View style={[styles.jobCard, Shadow.sm]}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job?.title ?? 'Cover Letter'}</Text>
          <Text style={styles.company}>{job?.company}</Text>
        </View>

        {!result && !isPending && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Generate Cover Letter</Text>
            <Text style={styles.cardBody}>
              Our AI writes a professional, tailored cover letter using your resume experience and this job's requirements.
              No generic templates — it references your actual achievements.
            </Text>
            <TouchableOpacity style={styles.generateBtn} onPress={() => generate()}>
              <Text style={styles.generateBtnText}>Generate Cover Letter</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPending && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Writing your cover letter…</Text>
          </View>
        )}

        {result && (
          <>
            {/* Subject line */}
            <View style={[styles.card, Shadow.sm]}>
              <Text style={styles.fieldLabel}>Subject Line</Text>
              <Text style={styles.subjectLine}>{result.subject_line}</Text>
              <TouchableOpacity onPress={() => Clipboard.setString(result.subject_line)}>
                <Text style={styles.copySmall}>Copy subject</Text>
              </TouchableOpacity>
            </View>

            {/* Key highlights */}
            {result.key_highlights?.length > 0 && (
              <View style={[styles.card, Shadow.sm]}>
                <Text style={styles.cardTitle}>Key Highlights Used</Text>
                {result.key_highlights.map((h: string, i: number) => (
                  <View key={i} style={styles.highlightRow}>
                    <Text style={styles.highlightIcon}>✓</Text>
                    <Text style={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Cover letter body */}
            <View style={[styles.card, Shadow.sm]}>
              <View style={styles.letterHeader}>
                <Text style={styles.cardTitle}>Cover Letter</Text>
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                  <Text style={styles.editBtn}>{isEditing ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.letterInput}
                  value={editedLetter}
                  onChangeText={setEditedLetter}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              ) : (
                <Text style={styles.letterText}>{editedLetter}</Text>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: copied ? Colors.secondary : Colors.primary }]}
                onPress={handleCopy}
              >
                <Text style={styles.actionBtnText}>{copied ? '✓ Copied!' : 'Copy Letter'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.surfaceSecondary }]}
                onPress={() => generate()}
              >
                <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  jobCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md },
  jobTitle: { ...Typography.h4, color: Colors.text },
  company: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  cardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  cardBody: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },

  generateBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  generateBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  loadingCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.label, color: Colors.textSecondary },

  fieldLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  subjectLine: { ...Typography.label, color: Colors.text, marginBottom: Spacing.sm },
  copySmall: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  highlightRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  highlightIcon: { color: Colors.secondary, fontWeight: '700', fontSize: 14, marginTop: 2 },
  highlightText: { ...Typography.body, color: Colors.text, flex: 1, lineHeight: 22 },

  letterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  editBtn: { ...Typography.label, color: Colors.primary, fontWeight: '600' },
  letterText: { ...Typography.body, color: Colors.text, lineHeight: 26 },
  letterInput: {
    ...Typography.body, color: Colors.text, lineHeight: 26,
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    padding: Spacing.md, minHeight: 300, borderWidth: 1, borderColor: Colors.primary,
  },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  actionBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
