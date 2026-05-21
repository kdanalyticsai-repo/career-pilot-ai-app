import { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

interface ProviderProfile {
  company_name: string | null;
  company_size: string | null;
  industry: string | null;
  website: string | null;
}

interface JobListing {
  id: string;
  applicant_count?: number;
  application_count?: number;
}

const SUPPORT_EMAIL = 'info@kdaanalytics.com';
const PRIVACY_URL = 'https://cvpilot.kdaanalytics.com/privacy';
const TERMS_URL = 'https://cvpilot.kdaanalytics.com/terms';

export default function ProviderProfileScreen() {
  const { user, logout, setUser } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      authService.getMe().then(setUser).catch(() => {});
    }, [])
  );

  const { data: profile } = useQuery<ProviderProfile>({
    queryKey: ['provider-profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/provider-profile');
      return data;
    },
  });

  const { data: jobs } = useQuery<JobListing[]>({
    queryKey: ['provider-jobs'],
    queryFn: async () => {
      const { data } = await api.get('/provider/jobs');
      return data;
    },
  });

  const liveJobs = jobs?.length ?? 0;
  const totalApplicants = jobs?.reduce((sum, j) => sum + (j.applicant_count ?? j.application_count ?? 0), 0) ?? 0;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.name
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  const panBadge = user?.pan_verified
    ? { label: '✓ PAN Verified', color: Colors.matchHigh, bg: Colors.matchHigh + '15', border: Colors.matchHigh + '40' }
    : user?.company_pan
    ? { label: '⏳ Verification Pending', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' }
    : null;

  const menuSection = (
    label: string,
    items: { icon: string; title: string; sub?: string; onPress: () => void }[]
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={[styles.menuCard, Shadow.sm]}>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.menuRow, idx < items.length - 1 && styles.menuRowBorder]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrap}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuLabelWrap}>
              <Text style={styles.menuLabel}>{item.title}</Text>
              {item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Company Header Card */}
        <View style={[styles.headerCard, Shadow.md]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'Provider'}</Text>
          <View style={styles.contactRow}>
            {user?.phone ? <Text style={styles.contactText}>📞 {user.phone}</Text> : null}
            <Text style={styles.contactText}>✉ {user?.email}</Text>
          </View>
          {profile?.company_name ? (
            <Text style={styles.companyName}>🏢 {profile.company_name}</Text>
          ) : null}
          {panBadge ? (
            <View style={[styles.panBadge, { backgroundColor: panBadge.bg, borderColor: panBadge.border }]}>
              <Text style={[styles.panBadgeText, { color: panBadge.color }]}>{panBadge.label}</Text>
            </View>
          ) : null}
        </View>

        {/* Industry Chip */}
        {profile?.industry ? (
          <View style={styles.industryRow}>
            <Text style={styles.industryLabel}>Hiring for</Text>
            <View style={styles.industryChip}>
              <Text style={styles.industryChipText}>{profile.industry}</Text>
            </View>
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, Shadow.sm]}
            onPress={() => router.push('/(provider-tabs)/listings' as any)}
            activeOpacity={0.75}
          >
            <Text style={styles.statNumber}>{liveJobs}</Text>
            <Text style={styles.statLabel}>Live Jobs</Text>
            <Text style={styles.statHint}>tap to view →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, Shadow.sm]}
            onPress={() => router.push('/provider/applicants' as any)}
            activeOpacity={0.75}
          >
            <Text style={styles.statNumber}>{totalApplicants}</Text>
            <Text style={styles.statLabel}>Applicants</Text>
            <Text style={styles.statHint}>tap to view →</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        {menuSection('Account', [
          { icon: '✏️', title: 'Edit Profile', sub: 'Update your information', onPress: () => router.push('/profile/edit' as any) },
          { icon: '🔐', title: 'Account & Security', sub: 'Password, session', onPress: () => router.push('/profile/settings' as any) },
        ])}

        {/* Quick Links */}
        {menuSection('Quick Links', [
          { icon: '📞', title: 'Contact Us', onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
          { icon: '📋', title: 'Terms & Conditions', onPress: () => Linking.openURL(TERMS_URL) },
          { icon: '🔒', title: 'Privacy Policy', onPress: () => Linking.openURL(PRIVACY_URL) },
          { icon: 'ℹ️', title: 'About ProAICV', sub: 'v1.0.0', onPress: () => {} },
        ])}

        <TouchableOpacity style={[styles.logoutBtn, Shadow.sm]} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { paddingBottom: Spacing.xxl, gap: Spacing.md, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  headerCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.primaryLight,
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: Colors.textInverse },
  name: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.xs },
  contactRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: 4, flexWrap: 'wrap', justifyContent: 'center' },
  contactText: { ...Typography.bodySmall, color: Colors.textSecondary },
  companyName: { ...Typography.label, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.sm },
  panBadge: {
    borderRadius: Radius.full, borderWidth: 1,
    paddingHorizontal: Spacing.md, paddingVertical: 5, marginTop: 4,
  },
  panBadgeText: { ...Typography.caption, fontWeight: '600' },

  industryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  industryLabel: { ...Typography.caption, color: Colors.textMuted },
  industryChip: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary + '30',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  industryChipText: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingVertical: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  statLabel: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
  statHint: { ...Typography.caption, color: Colors.primary, marginTop: 2, fontSize: 10 },

  section: { gap: Spacing.xs },
  sectionLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
  },
  menuCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle, overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: Radius.sm + 2,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIcon: { fontSize: 15 },
  menuLabelWrap: { flex: 1 },
  menuLabel: { ...Typography.label, color: Colors.text },
  menuSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  menuChevron: { fontSize: 18, color: Colors.textMuted },

  logoutBtn: {
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    backgroundColor: HeroColors.base,
    marginHorizontal: Spacing.sm,
  },
  logoutText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
