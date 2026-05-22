import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Clipboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function ApplicantDetailScreen() {
  const { id: applicationId } = useLocalSearchParams<{ id: string }>();

  const { data: applicant, isLoading, isError } = useQuery({
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
          <Text style={styles.errorBody}>This may be a permissions issue. Ensure your listing has admin-approved applicant access.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              {applicant.status?.charAt(0).toUpperCase() + applicant.status?.slice(1) ?? 'Applied'}
            </Text>
          </View>
        </View>

        {/* Contact details */}
        <View style={[styles.infoCard, Shadow.sm]}>
          <Text style={styles.infoCardTitle}>Contact Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <View style={styles.infoValueRow}>
              <Text style={styles.infoValue}>{applicant.applicant_email}</Text>
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

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Applied On</Text>
            <Text style={styles.infoValue}>{appliedDate}</Text>
          </View>
        </View>

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
    fontSize: 11, textAlign: 'center', marginBottom: Spacing.xs,
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
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoValue: { ...Typography.body, color: Colors.text, flex: 1 },
  copyBtn: { ...Typography.caption, color: Colors.primary, fontWeight: '700', paddingLeft: Spacing.sm },

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
