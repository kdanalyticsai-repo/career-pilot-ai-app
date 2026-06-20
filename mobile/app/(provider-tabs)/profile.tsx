import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

const SUPPORT_EMAIL = 'info@kdaanalytics.com';

const FAQ_ITEMS = [
  {
    q: 'How do job listings work?',
    a: 'Post a single job manually or bulk-upload multiple jobs at once. All listings go through our team\'s review before appearing on the job feed — typically within 24–48 hours.',
  },
  {
    q: 'Can I edit a listing after posting?',
    a: 'Yes — pending and rejected listings can be edited anytime. Once a listing is approved and live, contact our team to request changes.',
  },
  {
    q: 'What is PAN verification?',
    a: 'We verify your company PAN to build a trusted hiring platform. Add your PAN on Edit Profile. Our team reviews it and marks it verified within 2–3 business days. Verified hirers get a badge on their profile.',
  },
  {
    q: 'How does bulk upload work?',
    a: 'Download the Excel template from the Bulk Upload page, fill in at least 25 job rows, then upload. Each job goes through the same review as a single listing. You\'ll receive an email summary with results and any row-level errors.',
  },
  {
    q: 'How do I view applicants?',
    a: 'Tap any listing in My Listings, then switch to the Applicants tab. You can also tap the Applicants tile on the Home screen to see all applicants across every listing at once.',
  },
  {
    q: 'Why isn\'t my listing live yet?',
    a: 'All new listings need admin approval before going live. This usually takes 24–48 hours. You\'ll be notified by email when your listing is approved or if any changes are needed.',
  },
  {
    q: 'What is the minimum for bulk upload?',
    a: 'Bulk upload requires at least 25 job rows per file. For fewer jobs, use the Single Job Listing form — there\'s no minimum there.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.faqRow, open && styles.faqRowOpen]}
      onPress={() => setOpen(v => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.faqTop}>
        <Text style={styles.faqQ}>{q}</Text>
        <Text style={styles.faqChevron}>{open ? '▲' : '▼'}</Text>
      </View>
      {open ? <Text style={styles.faqA}>{a}</Text> : null}
    </TouchableOpacity>
  );
}

export default function ProviderProfileScreen() {
  const { user, logout } = useAuthStore();

  const { data: providerProfile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => api.get('/users/me/provider-profile').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['provider-jobs-stats'],
    queryFn: () => api.get('/provider/jobs').then((r) => r.data),
    staleTime: 30_000,
  });

  const jobs: { is_active: boolean; applicant_count: number }[] = jobsData?.jobs ?? jobsData ?? [];
  const liveJobs = jobs.filter((j) => j.is_active).length;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicant_count ?? 0), 0);

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const verificationBadge = user?.pan_verified
    ? { label: '✓ PAN Verified', color: Colors.matchHigh, bg: Colors.matchHigh + '18' }
    : user?.company_pan
    ? { label: '⏳ Verification Pending', color: Colors.warning, bg: Colors.warning + '18' }
    : null;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

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

        {/* Company Header */}
        <View style={[styles.companyCard, Shadow.sm]}>
          <View style={styles.companyTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.hrName}>{user?.name || 'Hiring Manager'}</Text>
              <View style={styles.contactRow}>
                {user?.phone ? <Text style={styles.contactText}>📞 {user.phone}</Text> : null}
                {user?.email ? <Text style={styles.contactText} numberOfLines={1}>✉ {user.email}</Text> : null}
              </View>
            </View>
          </View>
          {providerProfile?.company_name ? (
            <View style={styles.companyRow}>
              <Text style={styles.companyIcon}>🏢</Text>
              <Text style={styles.companyName}>{providerProfile.company_name}</Text>
            </View>
          ) : null}
          {verificationBadge ? (
            <View style={[styles.verifyBadge, { backgroundColor: verificationBadge.bg }]}>
              <Text style={[styles.verifyBadgeText, { color: verificationBadge.color }]}>{verificationBadge.label}</Text>
            </View>
          ) : null}
        </View>

        {providerProfile?.industry ? (
          <View style={styles.hiringForRow}>
            <Text style={styles.hiringForLabel}>Hiring for</Text>
            <View style={styles.hiringForChip}>
              <Text style={styles.hiringForChipText}>{providerProfile.industry}</Text>
            </View>
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, Shadow.sm]}>
            <Text style={styles.statValue}>{liveJobs}</Text>
            <Text style={styles.statLabel}>Live Jobs</Text>
          </View>
          <View style={[styles.statCard, Shadow.sm]}>
            <Text style={styles.statValue}>{totalApplicants}</Text>
            <Text style={styles.statLabel}>Applicants</Text>
          </View>
        </View>

        {menuSection('Account', [
          { icon: '✏️', title: 'Edit Profile', sub: 'Update your information', onPress: () => router.push('/profile/edit' as any) },
          { icon: '🔐', title: 'Account & Security', sub: 'Password, session', onPress: () => router.push('/profile/settings' as any) },
        ])}

        {menuSection('Quick Links', [
          { icon: '📞', title: 'Contact Us', onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
          { icon: '📋', title: 'Terms & Conditions', onPress: () => Linking.openURL('https://kdaanalytics.com/proaicv/terms/') },
          { icon: '🔒', title: 'Privacy Policy', onPress: () => Linking.openURL('https://kdaanalytics.com/proaicv/privacy/') },
          { icon: 'ℹ️', title: 'About ProAICV', sub: 'v1.0.1', onPress: () => router.push('/about' as any) },
        ])}

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FAQ</Text>
          <View style={[styles.menuCard, Shadow.sm]}>
            {FAQ_ITEMS.map((item, idx) => (
              <View key={item.q} style={idx < FAQ_ITEMS.length - 1 ? styles.faqDivider : undefined}>
                <FaqItem q={item.q} a={item.a} />
              </View>
            ))}
          </View>
        </View>

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

  companyCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md, gap: Spacing.sm,
  },
  companyTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: Colors.primaryDark },
  companyInfo: { flex: 1, gap: 2 },
  hrName: { ...Typography.h4, color: Colors.text },
  contactRow: { gap: 1 },
  contactText: { ...Typography.caption, color: Colors.textMuted },
  companyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
  },
  companyIcon: { fontSize: 14 },
  companyName: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  verifyBadge: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  verifyBadgeText: { ...Typography.caption, fontWeight: '700' },

  hiringForRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  hiringForLabel: { ...Typography.caption, color: Colors.textMuted },
  hiringForChip: {
    backgroundColor: Colors.primary + '12', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  hiringForChipText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md, alignItems: 'center', gap: 2,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  statLabel: { ...Typography.caption, color: Colors.textMuted },

  section: { gap: Spacing.xs },
  sectionLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: Spacing.xs,
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
    backgroundColor: Colors.surfaceLow, alignItems: 'center', justifyContent: 'center',
  },
  menuIcon: { fontSize: 15 },
  menuLabelWrap: { flex: 1 },
  menuLabel: { ...Typography.label, color: Colors.text },
  menuSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  menuChevron: { fontSize: 18, color: Colors.textMuted },

  faqDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  faqRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  faqRowOpen: { backgroundColor: Colors.surfaceLow },
  faqTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  faqQ: { ...Typography.label, color: Colors.text, flex: 1, lineHeight: 20 },
  faqChevron: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  faqA: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20, marginTop: Spacing.sm },

  logoutBtn: {
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    backgroundColor: HeroColors.base, marginHorizontal: Spacing.sm,
  },
  logoutText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
