import { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';
import { isTrialEnded, formatTrialEnd } from '@/utils/subscription';

function UsageBar({ used, limit, label }: { used: number; limit: number | null; label: string }) {
  const pct = limit == null || limit <= 0 ? 1 : Math.min(used / limit, 1);
  const color = pct >= 1 ? Colors.danger : pct >= 0.7 ? Colors.warning : Colors.tertiary;
  return (
    <View style={usageStyles.wrap}>
      <View style={usageStyles.labelRow}>
        <Text style={usageStyles.label}>{label}</Text>
        <Text style={[usageStyles.count, { color }]}>
          {used}{limit != null ? `/${limit}` : ''}
        </Text>
      </View>
      <View style={usageStyles.track}>
        <View style={[usageStyles.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const usageStyles = StyleSheet.create({
  wrap: { marginBottom: Spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { ...Typography.caption, color: Colors.textSecondary },
  count: { ...Typography.caption, fontWeight: '700' },
  track: { height: 5, backgroundColor: Colors.backgroundDim, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
});

export default function ProfileTab() {
  const { user, logout, setUser } = useAuthStore();
  const isPro = user?.subscription === 'pro';

  useFocusEffect(
    useCallback(() => {
      authService.getMe().then(setUser).catch(() => {});
    }, [])
  );

  const { data: usageData } = useQuery({
    queryKey: ['my-usage'],
    queryFn: () => api.get('/subscriptions/my-usage').then((r) => r.data),
    staleTime: 60_000,
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const rows: { label: string; icon: string; route: string; sub?: string }[] = [
    { label: 'Edit Profile', icon: '✏️', route: '/profile/edit', sub: 'Update your information' },
    { label: 'Notification Settings', icon: '🔔', route: '/profile/notifications', sub: 'Manage alerts' },
    { label: 'Settings', icon: '⚙️', route: '/profile/settings', sub: 'Privacy, data & more' },
  ];

  const SUPPORT_EMAIL = 'info@kdaanalytics.com';

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  const usage = usageData?.usage ?? {};
  const trialEnded = isTrialEnded(usageData);
  const trialEndDate = formatTrialEnd(usageData);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero Profile Header */}
        <View style={styles.heroHeader}>
          <View style={styles.heroOrb} />
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>{user?.name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          <TouchableOpacity
            style={[styles.planBadge, isPro && styles.planBadgePro]}
            onPress={() => !isPro && router.push('/paywall')}
            activeOpacity={isPro ? 1 : 0.8}
          >
            <Text style={[styles.planBadgeText, isPro && styles.planBadgeTextPro]}>
              ✦  {isPro ? 'PRO MEMBER' : 'FREE PLAN — Tap to Upgrade'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Usage / Trial-ended */}
        {!isPro && usageData && (
          trialEnded ? (
            <View style={[styles.menuCard, Shadow.sm, { padding: Spacing.md }]}>
              <View style={styles.trialEndedCard}>
                <Text style={styles.trialEndedIcon}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trialEndedTitle}>Free trial ended</Text>
                  {trialEndDate ? (
                    <Text style={styles.trialEndedDate}>on {trialEndDate}</Text>
                  ) : null}
                  <Text style={styles.trialEndedBody}>Upgrade to Pro to continue using AI features.</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.trialUpgradeBtn, Shadow.sm]} onPress={() => router.push('/paywall')} activeOpacity={0.85}>
                <Text style={styles.trialUpgradeBtnText}>Upgrade to Pro →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.menuCard, Shadow.sm, { padding: Spacing.md }]}>
              <Text style={styles.sectionLabel}>This Month's Usage</Text>
              {usage.chat && <UsageBar label="AI Coach Chats" used={usage.chat.used ?? 0} limit={usage.chat.limit} />}
              {usage.interview_prep && <UsageBar label="Interview Prep" used={usage.interview_prep.used ?? 0} limit={usage.interview_prep.limit} />}
              {usage.cover_letter && <UsageBar label="Cover Letters" used={usage.cover_letter.used ?? 0} limit={usage.cover_letter.limit} />}
              {usage.tailor && <UsageBar label="Resume Tailoring" used={usage.tailor.used ?? 0} limit={usage.tailor.limit} />}
              <TouchableOpacity style={styles.upgradeInline} onPress={() => router.push('/paywall')} activeOpacity={0.8}>
                <Text style={styles.upgradeInlineText}>Upgrade to Pro for unlimited access →</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Pro banner */}
        {isPro && (
          <View style={[styles.proBanner, Shadow.sm]}>
            <View style={styles.proBannerIconWrap}>
              <Text style={styles.proBannerIcon}>✦</Text>
            </View>
            <View style={styles.proBannerText}>
              <Text style={styles.proBannerTitle}>Pro Member — All features unlocked</Text>
              {usageData?.pro_expires_at ? (
                <Text style={styles.proBannerSub}>
                  Expires {new Date(usageData.pro_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={[styles.menuCard, Shadow.sm]}>
          {rows.map(({ label, icon, route, sub }) => (
            <TouchableOpacity
              key={route}
              style={styles.menuRow}
              onPress={() => router.push(route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconWrap}>
                <Text style={styles.menuIcon}>{icon}</Text>
              </View>
              <View style={styles.menuLabelWrap}>
                <Text style={styles.menuLabel}>{label}</Text>
                {sub && <Text style={styles.menuSub}>{sub}</Text>}
              </View>
              <View style={styles.chevronWrap}>
                <Text style={styles.menuChevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
          {isPro && (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: Colors.primaryLight }]}>
                <Text style={styles.menuIcon}>✉️</Text>
              </View>
              <View style={styles.menuLabelWrap}>
                <Text style={styles.menuLabel}>Pro Support</Text>
                <Text style={[styles.menuSub, { color: Colors.primary }]}>{SUPPORT_EMAIL}</Text>
              </View>
              <View style={styles.chevronWrap}>
                <Text style={styles.menuChevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* App Info */}
        <View style={[styles.menuCard, Shadow.sm]}>
          <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
            <View style={styles.menuIconWrap}>
              <Text style={styles.menuIcon}>ℹ️</Text>
            </View>
            <View style={styles.menuLabelWrap}>
              <Text style={styles.menuLabel}>App Version</Text>
              <Text style={styles.menuSub}>ProAICV v1.0.0</Text>
            </View>
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
  container: { paddingBottom: Spacing.xxl, gap: Spacing.sm },

  /* ── Hero Header ── */
  heroHeader: {
    backgroundColor: HeroColors.base,
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: Colors.primary, opacity: 0.28, top: -80, right: -40,
  },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: Spacing.md,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.primaryLight + '40',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: Colors.textInverse },
  name: { fontSize: 22, fontWeight: '700', color: HeroColors.text, marginBottom: 4, letterSpacing: -0.2 },
  email: { ...Typography.body, color: HeroColors.textDim, marginBottom: 4 },
  phone: { ...Typography.bodySmall, color: HeroColors.textDim, marginBottom: Spacing.sm },

  planBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full, borderWidth: 1, borderColor: HeroColors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 6, marginTop: 4,
  },
  planBadgePro: {
    backgroundColor: 'rgba(255,209,0,0.15)',
    borderColor: 'rgba(255,209,0,0.35)',
  },
  planBadgeText: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  planBadgeTextPro: { color: '#ffd700' },

  sectionLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md,
  },
  upgradeInline: { marginTop: Spacing.sm },
  upgradeInlineText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  trialEndedCard: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', marginBottom: Spacing.md },
  trialEndedIcon: { fontSize: 22, marginTop: 2 },
  trialEndedTitle: { ...Typography.label, color: Colors.text, fontWeight: '700' },
  trialEndedDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  trialEndedBody: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  trialUpgradeBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 13, alignItems: 'center',
  },
  trialUpgradeBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  proBanner: {
    backgroundColor: HeroColors.base,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(91,46,255,0.5)',
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.md,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  proBannerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  proBannerIcon: { fontSize: 18, color: Colors.textInverse },
  proBannerText: { flex: 1 },
  proBannerTitle: { ...Typography.label, color: HeroColors.text, fontWeight: '700' },
  proBannerSub: { ...Typography.caption, color: HeroColors.textDim, marginTop: 2 },

  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderSubtle,
    marginHorizontal: Spacing.sm,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: Radius.sm + 2,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIcon: { fontSize: 16 },
  menuLabelWrap: { flex: 1 },
  menuLabel: { ...Typography.label, color: Colors.text },
  menuSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  chevronWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.backgroundDim,
    alignItems: 'center', justifyContent: 'center',
  },
  menuChevron: { fontSize: 16, color: Colors.textMuted },

  logoutBtn: {
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    backgroundColor: HeroColors.base,
    marginHorizontal: Spacing.sm,
  },
  logoutText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
