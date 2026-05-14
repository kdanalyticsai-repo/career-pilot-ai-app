import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { uploadResumePdf } from '@/services/upload';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export default function UploadResumeScreen() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    setFileName(file.name);
    setFileUri(file.uri);
    if (!resumeName) setResumeName(file.name.replace('.pdf', ''));
  };

  const upload = async () => {
    if (!fileUri || !fileName) {
      Alert.alert('Select a file', 'Please pick a PDF resume first.');
      return;
    }
    if (!resumeName.trim()) {
      Alert.alert('Name required', 'Give your resume a name.');
      return;
    }

    setIsUploading(true);
    try {
      const { data: uploadData } = await api.post('/resumes/upload', {
        filename: fileName,
        name: resumeName.trim(),
      });

      await uploadResumePdf(uploadData.upload_url, fileUri);

      await queryClient.invalidateQueries({ queryKey: ['resumes'] });
      Alert.alert('Uploaded!', 'Your resume is being analyzed. This takes about 30 seconds.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Upload failed', 'Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.pickArea} onPress={pickFile} disabled={isUploading}>
          <Text style={styles.pickIcon}>📄</Text>
          <Text style={styles.pickTitle}>{fileName ?? 'Tap to select PDF'}</Text>
          <Text style={styles.pickSub}>PDF format only, max 10MB</Text>
        </TouchableOpacity>

        <View style={styles.field}>
          <Text style={styles.label}>Resume Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Software Engineer Resume"
            value={resumeName}
            onChangeText={setResumeName}
            editable={!isUploading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!fileName || isUploading) && styles.buttonDisabled]}
          onPress={upload}
          disabled={!fileName || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>Upload & Analyze</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.lg },
  pickArea: {
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', marginBottom: Spacing.xl,
    backgroundColor: Colors.primary + '08',
  },
  pickIcon: { fontSize: 44, marginBottom: Spacing.sm },
  pickTitle: { ...Typography.h4, color: Colors.text, marginBottom: 4, textAlign: 'center' },
  pickSub: { ...Typography.bodySmall, color: Colors.textSecondary },
  field: { marginBottom: Spacing.lg },
  label: { ...Typography.label, color: Colors.text, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.surface,
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: 'auto',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },
});
