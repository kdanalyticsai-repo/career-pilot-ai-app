import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Clipboard, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import { API_URL } from '@/constants/config';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function ApplicantDetailScreen() {
  const { id: applicationId } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [downloadingResume, setDownloadingResume] = useState(false);

  const { data: applicant, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['applicant-detail', applicationId],
    queryFn: () => api.get(`/provider/applicants/${applicationId}`).then(r => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (isError || !applicant) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load applicant</Text>
          <Text style={styles.errorBody}>Ensure your listing has admin-approved applicant access.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDownloadResume = async () => {
    setDownloadingResume(true);
    try {
      const token = await storage.getAccessToken();
      const url = `${API_URL}/provider/applicants/${applicationId}/resume-download?token=${token ?? ''}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (err: any) {
      Alert.alert('Error', 'Could not open resume. Please try again.');
    } finally {
      setDownloadingResume(false);
    }
  };

  const initial = (applicant.applicant_name ?? applicant.applicant_email ?? '?')[0].toUpperCase();
  const appliedDate = new Date(applicant.applied_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Section label */}
        <Text style={styles.screenLabel}>APPLICANTS</Text>

        {/* Avatar + name */}
        <View style={[styles.profileCard, Shadow.sm]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.applicantName}>{applicant.applicant_name ?? '(no name)'}</Text>
          <Text style={styles.appliedFor}>Applied for: {applicant.job_title} · {applicant.job_company}</Text>
          <View style={[styles.statusChip, { backgroundColor: Colors.tertiary + '18' }]}>
            <Text style={[styles.statusChipText, { color: Colors.tertiary }]}>
              {applicant.status ? applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1) : 'Applied'}
            </Text>
          </View>
        </View>

        {/* Contact details */}
        <View style={[styles.infoCard, Shadow.sm]}>
          <Text style={styles.infoCardTitle}>Contact Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue} numberOfLines={1}>{applicant.applicant_email}</Text>
              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(applicant.applicant_email);
                  Alert.alert('Copied', 'Email address copied to clipboard');
                }}
              >
                <Text style={styles.copyBtn}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {applicant.applicant_phone ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{applicant.applicant_phone}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(applicant.applicant_phone);
                    Alert.alert('Copied', 'Phone number copied to clipboard');
                  }}
                >
                  <Text style={styles.copyBtn}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Applied On</Text>
            <Text style={styles.infoValue}>{appliedDate}</Text>
          </View>
        </View>

        {/* Resume info */}
        <View style={[styles.infoCard, Shadow.sm]}>
          <Text style={styles.infoCardTitle}>Resume</Text>
          {applicant.has_resume ? (
            <View style={styles.resumeBlock}>
              <View style={styles.resumeRow}>
                <Text style={styles.resumeIcon}>📄</Text>
                <Text style={styles.resumeName}>{applicant.resume_name ?? 'Resume uploaded'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.downloadBtn, downloadingResume && { opacity: 0.6 }]}
                onPress={handleDownloadResume}
                disabled={downloadingResume}
                activeOpacity={0.8}
              >
                {downloadingResume
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.downloadBtnText}>↓  Download Resume PDF</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noResume}>No resume uploaded</Text>
          )}
        </View>

        {/* Refresh */}
        <TouchableOpacity
          style={[styles.refreshBtn, isFetching && { opacity: 0.6 }]}
          onPress={() => refetch()}
          disabled={isFetching}
          activeOpacity={0.8}
        >
          {isFetching
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Text style={styles.refreshBtnText}>↻  Refresh</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  screenLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700',
    fontSize: 11, textAlign: 'center', marginTop: Spacing.sm,
  },

  profileCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  applicantName: { ...Typography.h3, color: Colors.text, textAlign: 'center' },
  appliedFor: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
  statusChip: {
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4,
  },
  statusChipText: { ...Typography.caption, fontWeight: '700', letterSpacing: 0.3 },

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  infoCardTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm },
  infoRow: {
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  infoLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoValue: { ...Typography.body, color: Colors.text, flex: 1 },
  copyBtn: { ...Typography.caption, color: Colors.primary, fontWeight: '700', paddingLeft: Spacing.sm },

  resumeBlock: { gap: Spacing.sm, paddingTop: Spacing.xs },
  resumeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resumeIcon: { fontSize: 22 },
  resumeName: { ...Typography.body, color: Colors.text, flex: 1 },
  noResume: { ...Typography.body, color: Colors.textMuted, fontStyle: 'italic' },
  downloadBtn: {
    borderWidth: 1, borderColor: Colors.primary + '50', borderRadius: Radius.md,
    paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.primaryLight,
  },
  downloadBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },

  refreshBtn: {
    borderWidth: 1.5, borderColor: Colors.primary + '50', borderRadius: Radius.lg,
    paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.primary + '08',
  },
  refreshBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '700' },

  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  errorIcon: { fontSize: 40 },
  errorTitle: { ...Typography.h4, color: Colors.text, textAlign: 'center' },
  errorBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 12, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm,
  },
  backBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
