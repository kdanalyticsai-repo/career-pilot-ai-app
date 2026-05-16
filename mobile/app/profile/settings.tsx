import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function SettingsScreen() {
  const { logout, user } = useAuthStore();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    Alert.alert(
      'Export Your Data',
      'We will prepare a summary of all your CVPilot data including resumes, applications, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setExporting(true);
            try {
              const res = await api.get('/users/me/export');
              Alert.alert(
                'Data Ready',
                'Your data export has been prepared. In a future update, it will be sent to your email.',
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
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all resumes, applications, and data. This cannot be undone.',
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

  const sections: {
    title: string;
    rows: { label: string; icon: string; sub?: string; onPress: () => void; danger?: boolean }[];
  }[] = [
    {
      title: 'Account',
      rows: [
        {
          label: 'Edit Profile',
          icon: '✏️',
          sub: user?.email ?? '',
          onPress: () => router.push('/profile/edit'),
        },
        {
          label: 'Subscription',
          icon: '✦',
          sub: user?.subscription === 'pro' ? 'Pro Plan · ₹199/month' : 'Free Plan · Upgrade for more',
          onPress: () => router.push('/paywall'),
        },
      ],
    },
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
          onPress: () =>
            Alert.alert('Privacy Policy', 'CVPilot collects only the data required to provide resume matching and career coaching. Your resume data is stored securely and never shared with third parties without your consent.'),
        },
        {
          label: 'Terms of Service',
          icon: '📄',
          sub: 'Usage terms and conditions',
          onPress: () =>
            Alert.alert('Terms of Service', 'By using CVPilot you agree to use the service for lawful job-search purposes only. AI-generated content is for guidance and should be reviewed before use.'),
        },
      ],
    },
    {
      title: 'Danger Zone',
      rows: [
        {
          label: 'Delete Account',
          icon: '🗑️',
          sub: 'Permanently remove all your data',
          onPress: handleDeleteAccount,
          danger: true,
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
                  <View style={[styles.iconWrap, row.danger && styles.iconWrapDanger]}>
                    <Text style={styles.rowIcon}>{row.icon}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, row.danger && { color: Colors.danger }]}>
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

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>CVPilot v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2026 CVPilot. All rights reserved.</Text>
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
  iconWrapDanger: { backgroundColor: Colors.danger + '15' },
  rowIcon: { fontSize: 16 },
  rowText: { flex: 1 },
  rowLabel: { ...Typography.label, color: Colors.text },
  rowSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  chevron: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },

  appInfo: { alignItems: 'center', marginTop: Spacing.lg, gap: 4 },
  appInfoText: { ...Typography.caption, color: Colors.textMuted },
});
