import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

export default function SettingsScreen() {
  const { logout, user } = useAuthStore();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    Alert.alert(
      'Export Your Data',
      'We will prepare a summary of all your ProAICV data including resumes, applications, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setExporting(true);
            try {
              const res = await api.get('/users/me/export');
              Alert.alert(
                'Export Sent',
                'Your data export has been sent to your registered email address.',
              );
            } catch {
              Alert.alert('Error', 'Could not export data. Please try again.');
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    const deleteMsg = user?.role === 'job_provider'
      ? 'This will permanently delete your account, all job listings, and associated data. This cannot be undone.'
      : 'This will permanently delete your account, all resumes, applications, and data. This cannot be undone.';
    Alert.alert(
      'Delete Account',
      deleteMsg,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete('/users/me');
              await logout();
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const isProvider = user?.role === 'job_provider';

  const sections: {
    title: string;
    rows: { label: string; icon: string; sub?: string; onPress: () => void }[];
  }[] = [
    ...(!isProvider ? [{
      title: 'Account',
      rows: [
        {
          label: 'Subscription',
          icon: '✦',
          sub: user?.subscription === 'pro' ? 'Pro Plan · Active' : 'Free Plan · Upgrade for more',
          onPress: () => router.push('/paywall'),
        },
      ],
    }] : []),
    ...(isProvider ? [{
      title: 'Company',
      rows: [
        {
          label: 'Verification Status',
          icon: '🏛️',
          sub: user?.pan_verified
            ? '✓ PAN verified by admin'
            : user?.company_pan
            ? '⏳ Verification pending review'
            : 'Submit company PAN to get verified',
          onPress: () => {
            const title = user?.pan_verified
              ? '✓ PAN Verified'
              : user?.company_pan
              ? '⏳ Verification Pending'
              : 'Not Submitted';
            const message = user?.pan_verified
              ? `Your company PAN (${user.company_pan}) has been verified by the ProAICV team. Your profile now shows the Verified badge.`
              : user?.company_pan
              ? `Your company PAN (${user.company_pan}) has been submitted and is under review. Our team typically verifies within 24 hours.`
              : 'You have not submitted a company PAN yet. Go to Edit Profile to add your PAN, CIN, or GSTIN for verification.';
            Alert.alert(title, message);
          },
        },
      ],
    }] : []),
    {
      title: 'Preferences',
      rows: [
        {
          label: 'Notification Settings',
          icon: '🔔',
          sub: 'Push and email alerts',
          onPress: () => router.push('/profile/notifications'),
        },
      ],
    },
    {
      title: 'Privacy & Data',
      rows: [
        {
          label: 'Export My Data',
          icon: '📤',
          sub: 'Download a copy of all your data',
          onPress: handleExportData,
        },
        {
          label: 'Privacy Policy',
          icon: '🔒',
          sub: 'How we handle your data',
          onPress: () => Linking.openURL('https://kdaanalytics.com/cvproai/privacy/'),
        },
        {
          label: 'Terms of Service',
          icon: '📄',
          sub: 'Usage terms and conditions',
          onPress: () =>
            Alert.alert('Terms of Service', 'By using ProAICV you agree to use the service for lawful job-search purposes only. AI-generated content is for guidance and should be reviewed before use.'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {sections.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.card, Shadow.sm]}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  style={[styles.row, i < section.rows.length - 1 && styles.rowBorder]}
                  onPress={row.onPress}
                  disabled={exporting || deleting}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconWrap}>
                    <Text style={styles.rowIcon}>{row.icon}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>
                      {row.label}
                    </Text>
                    {row.sub ? <Text style={styles.rowSub} numberOfLines={1}>{row.sub}</Text> : null}
                  </View>
                  {(row.label === 'Export My Data' && exporting) ||
                  (row.label === 'Delete Account' && deleting) ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.deleteBtn, Shadow.sm]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.8}
        >
          {deleting
            ? <ActivityIndicator size="small" color={Colors.textInverse} />
            : <Text style={styles.deleteBtnText}>Delete Account</Text>
          }
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>ProAICV v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2026 ProAICV. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  sectionWrap: { marginBottom: Spacing.md },
  sectionTitle: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: Spacing.sm, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap: {
    width: 36, height: 36, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIcon: { fontSize: 16 },
  rowText: { flex: 1 },
  rowLabel: { ...Typography.label, color: Colors.text },
  rowSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  chevron: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },

  deleteBtn: {
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    backgroundColor: HeroColors.base,
    marginHorizontal: Spacing.sm,
  },
  deleteBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  appInfo: { alignItems: 'center', marginTop: Spacing.lg, gap: 4 },
  appInfoText: { ...Typography.caption, color: Colors.textMuted },
});
