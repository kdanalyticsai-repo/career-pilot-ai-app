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
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

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
    } catch (err: any) {
      const status = err?.response?.status;
      let msg = 'Upload failed. Please try again.';
      if (!status) {
        msg = 'No internet connection. Please check your network and try again.';
      } else if (status === 401 || status === 403) {
        msg = 'Your session has expired. Please log out and sign in again.';
      } else if (status === 413) {
        msg = 'File is too large. Please use a PDF under 10 MB.';
      } else if (status === 400) {
        msg = 'This file could not be processed. Make sure it is a valid PDF and try again.';
      }
      Alert.alert('Upload Failed', msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>

        {/* Drop Zone */}
        <TouchableOpacity
          style={[styles.pickArea, fileName && styles.pickAreaSelected, Shadow.sm]}
          onPress={pickFile}
          disabled={isUploading}
          activeOpacity={0.85}
        >
          <View style={[styles.pickIconWrap, fileName && { backgroundColor: Colors.primary + '20' }]}>
            <Text style={styles.pickIcon}>{fileName ? '✅' : '📄'}</Text>
          </View>
          <Text style={[styles.pickTitle, fileName && { color: Colors.primary }]}>
            {fileName ?? 'Tap to select PDF'}
          </Text>
          <Text style={styles.pickSub}>
            {fileName ? 'Tap to choose a different file' : 'PDF format only · max 10 MB'}
          </Text>
          {!fileName && (
            <View style={styles.browseChip}>
              <Text style={styles.browseChipText}>Browse Files</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Tip box */}
        {!fileName && (
          <View style={styles.tipBox}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Upload your latest PDF resume to get an ATS score and AI-powered job matches.</Text>
          </View>
        )}

        {/* Resume Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Resume Name</Text>
          <TextInput
            style={[styles.input, isUploading && styles.inputDisabled]}
            placeholder="e.g. Software Engineer Resume"
            placeholderTextColor={Colors.textMuted}
            value={resumeName}
            onChangeText={setResumeName}
            editable={!isUploading}
          />
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.button, Shadow.md, (!fileName || isUploading) && styles.buttonDisabled]}
          onPress={upload}
          disabled={!fileName || isUploading}
          activeOpacity={0.85}
        >
          {isUploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={Colors.textInverse} size="small" />
              <Text style={styles.buttonText}>Uploading & Analyzing…</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>✦  Upload & Analyze</Text>
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
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: Radius.xl, paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg,
    alignItems: 'center', marginBottom: Spacing.md,
    backgroundColor: Colors.surface, gap: Spacing.sm,
  },
  pickAreaSelected: {
    borderColor: Colors.primary, borderStyle: 'solid',
    backgroundColor: Colors.primaryLight + '18',
  },
  pickIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pickIcon: { fontSize: 30 },
  pickTitle: { ...Typography.h4, color: Colors.text, textAlign: 'center' },
  pickSub: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center' },
  browseChip: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: 9, marginTop: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  browseChipText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight + '40', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '25',
  },
  tipIcon: { fontSize: 16, marginTop: 1 },
  tipText: { ...Typography.bodySmall, color: Colors.primaryDark, flex: 1, lineHeight: 19 },

  field: { marginBottom: Spacing.lg },
  label: { ...Typography.label, color: Colors.text, fontWeight: '600', marginBottom: Spacing.xs },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.surface,
  },
  inputDisabled: { opacity: 0.6 },

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: 'auto',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
