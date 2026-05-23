import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { uploadResumePdf } from '@/services/upload';

export default function OnboardingStep3() {
  const params = useLocalSearchParams();
  const { user, setUser } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    setFileName(file.name);
    setIsUploading(true);

    try {
      // 1. Get pre-signed S3 URL
      const { data: uploadData } = await api.post('/resumes/upload', {
        filename: file.name,
        name: file.name.replace('.pdf', ''),
      });

      // 2. Upload PDF directly to S3
      await uploadResumePdf(uploadData.upload_url, file.uri);

      // 3. Complete onboarding
      await api.post('/users/me/onboarding', {
        name: params.name,
        phone: params.phone || null,
        preferences: {
          experience_level: params.experienceLevel,
          remote_preference: params.remotePreference,
          job_types: String(params.jobTypes || '').split(',').map((t: string) => t.toLowerCase()),
          industries: params.industry ? [String(params.industry)] : [],
        },
      });

      if (user) {
        setUser({ ...user, onboarded: true });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const status = err?.response?.status;
      const isNetwork = !status && !err?.message?.includes('Upload');
      if (isNetwork) {
        Alert.alert('No Connection', 'Please check your internet connection and try again.');
      } else if (status === 413) {
        Alert.alert('File Too Large', 'Your PDF exceeds the 10 MB limit. Please compress it and try again.');
      } else if (status === 415) {
        Alert.alert('Invalid File', 'Only PDF files are supported. Please select a valid PDF.');
      } else if (status >= 500) {
        Alert.alert('Server Error', 'Our servers are having trouble processing your resume. Please try again.');
      } else {
        const detail = err?.response?.data?.detail ?? err?.message ?? 'Could not upload your resume. Please try again.';
        Alert.alert('Upload Failed', detail);
      }
      setFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const skipForNow = async () => {
    try {
      await api.post('/users/me/onboarding', {
        name: params.name,
        phone: params.phone || null,
        preferences: {},
      });
      if (user) setUser({ ...user, onboarded: true });
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    }
  };

  const BENEFITS = [
    { icon: '✦', text: 'AI-powered resume analysis' },
    { icon: '📊', text: 'Instant ATS score & breakdown' },
    { icon: '🎯', text: 'Personalized job matches' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.progress}>
          <View style={[styles.progressStep, styles.progressDone]} />
          <View style={[styles.progressStep, styles.progressDone]} />
          <View style={[styles.progressStep, styles.progressActive]} />
        </View>

        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>Upload your resume</Text>
        <Text style={styles.subtitle}>We'll analyze it with AI and find your best matches</Text>

        <TouchableOpacity
          style={[styles.uploadBox, fileName && styles.uploadBoxSelected, Shadow.sm]}
          onPress={pickAndUpload}
          disabled={isUploading}
          activeOpacity={0.85}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.uploadTitle}>Analyzing with AI…</Text>
              <Text style={styles.uploadSubtext}>This takes about 30 seconds</Text>
            </>
          ) : (
            <>
              <View style={[styles.uploadIconWrap, fileName && { backgroundColor: Colors.primary + '20' }]}>
                <Text style={styles.uploadIcon}>{fileName ? '✅' : '📄'}</Text>
              </View>
              <Text style={[styles.uploadTitle, fileName && { color: Colors.primary }]}>
                {fileName ?? 'Tap to select your PDF resume'}
              </Text>
              <Text style={styles.uploadSubtext}>
                {fileName ? 'Tap to choose a different file' : 'PDF format only · max 10 MB'}
              </Text>
              {!fileName && (
                <View style={styles.browseChip}>
                  <Text style={styles.browseChipText}>Browse Files</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>

        {!fileName && !isUploading && (
          <View style={styles.tipBox}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Upload your latest PDF resume to get an ATS score and AI-powered job matches.</Text>
          </View>
        )}

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={skipForNow} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip for now →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.lg },

  progress: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressStep: { height: 4, flex: 1, borderRadius: 2, backgroundColor: Colors.backgroundDim },
  progressActive: { backgroundColor: Colors.primary },
  progressDone: { backgroundColor: Colors.secondary },

  step: { ...Typography.caption, color: Colors.primary, fontWeight: '700', marginBottom: Spacing.xs, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs, letterSpacing: -0.3 },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 22 },

  uploadBox: {
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: Radius.xl, paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg,
    alignItems: 'center', backgroundColor: Colors.surface,
    marginBottom: Spacing.lg, gap: Spacing.sm,
  },
  uploadBoxSelected: {
    borderColor: Colors.primary, borderStyle: 'solid',
    backgroundColor: Colors.primaryLight + '18',
  },
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
  uploadIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  uploadIcon: { fontSize: 30 },
  uploadTitle: { ...Typography.h4, color: Colors.text, textAlign: 'center' },
  uploadSubtext: { ...Typography.caption, color: Colors.textMuted },

  benefits: { gap: Spacing.sm, marginBottom: Spacing.lg },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  benefitIconWrap: {
    width: 32, height: 32, borderRadius: Radius.sm + 2,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  benefitIcon: { fontSize: 14, color: Colors.primary },
  benefitText: { ...Typography.body, color: Colors.text },

  skipButton: { alignItems: 'center', padding: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  skipText: { ...Typography.label, color: Colors.textMuted, fontWeight: '600' },
});
