import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
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
        },
      });

      if (user) {
        setUser({ ...user, onboarded: true });
      }
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Upload failed', 'Please try again.');
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>Upload your resume</Text>
        <Text style={styles.subtitle}>We'll analyze it and find your best job matches</Text>

        <TouchableOpacity
          style={styles.uploadBox}
          onPress={pickAndUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.uploadSubtext}>Analyzing with AI...</Text>
            </>
          ) : (
            <>
              <Text style={styles.uploadIcon}>📄</Text>
              <Text style={styles.uploadTitle}>
                {fileName ?? 'Tap to select your PDF resume'}
              </Text>
              <Text style={styles.uploadSubtext}>PDF format, max 10MB</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.benefits}>
          {['AI-powered resume analysis', 'Instant ATS score', 'Personalized job matches'].map((b) => (
            <View key={b} style={styles.benefitRow}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={skipForNow}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.lg },
  progress: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  dotDone: { backgroundColor: Colors.secondary, width: 24 },
  step: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.xs },
  title: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl },
  uploadBox: {
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', backgroundColor: Colors.primary + '08',
    marginBottom: Spacing.xl,
  },
  uploadIcon: { fontSize: 40, marginBottom: Spacing.sm },
  uploadTitle: { ...Typography.h4, color: Colors.text, textAlign: 'center', marginBottom: Spacing.xs },
  uploadSubtext: { ...Typography.bodySmall, color: Colors.textSecondary },
  benefits: { gap: Spacing.sm, marginBottom: Spacing.xl },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  check: { color: Colors.secondary, fontSize: 16, fontWeight: '700' },
  benefitText: { ...Typography.body, color: Colors.text },
  skipButton: { alignItems: 'center', padding: Spacing.md },
  skipText: { ...Typography.body, color: Colors.textSecondary, textDecorationLine: 'underline' },
});
