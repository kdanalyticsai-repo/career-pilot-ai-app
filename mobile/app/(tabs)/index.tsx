import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useResumeStore } from '@/stores/resumeStore';
import { useResumes } from '@/hooks/useResumes';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';
import { apiClient } from '@/services/api';
import { isTrialEnded } from '@/utils/subscription';

interface AnalyticsSummary {
  total: number;
  by_status: Record<string, number>;
}

function getScoreColor(score: number | null): string {
  if (!score) return Colors.textMuted;
  if (score >= 80) return Colors.matchHigh;
  if (score >= 60) return Colors.matchMid;
  return Colors.matchLow;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { getPrimaryResume } = useResumeStore();
  const [refreshing, setRefreshing] = useState(false);
  useResumes();

  const { data: appStats, refetch: refetchStats } = useQuery<AnalyticsSummary>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get('/analytics/dashboard').then(r => r.data.applications),
    staleTime: 30_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  }, [refetchStats]);

  const primaryResume = getPrimaryResume();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const atsScore = primaryResume?.ats_score ?? null;
  const scoreColor = getScoreColor(atsScore);
  const isPro = user?.subscription === 'pro';

  const { data: usageData } = useQuery({
    queryKey: ['my-usage'],
    queryFn: () => apiClient.get('/subscriptions/my-usage').then((r) => r.data),
    enabled: !isPro,
    staleTime: 60_000,
  });
  const trialEnded = isTrialEnded(usageData);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={HeroColors.base} />

      {/* ── Gradient Header ── */}
      <View style={styles.heroHeader}>
        <View style={styles.heroOrb1} />
        <View style={styles.heroOrb2} />
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.greeting}>{getTimeOfDay()},</Text>
              <Text style={styles.greetingName}>{firstName} {isPro ? '✦' : '👋'}</Text>
            </View>
            {isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.greetingSub}>Here's your career overview</Text>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >

        {/* Trial-ended upgrade banner */}
        {trialEnded && (
          <TouchableOpacity style={[styles.trialBanner, Shadow.sm]} onPress={() => router.push('/paywall')} activeOpacity={0.85}>
            <Text style={styles.trialBannerIcon}>⏰</Text>
            <View style={styles.trialBannerText}>
              <Text style={styles.trialBannerTitle}>Your free trial has ended</Text>
              <Text style={styles.trialBannerSub}>Upgrade to Pro to unlock all AI features →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ATS Score + Quick Stats */}
        <View style={styles.scoreRow}>
          {/* ATS Card */}
          <TouchableOpacity
            style={[styles.atsCard, Shadow.md]}
            onPress={() => router.push('/(tabs)/resume')}
            activeOpacity={0.85}
          >
            <Text style={styles.atsLabel}>ATS Score</Text>
            {atsScore != null ? (
              <>
                <Text style={[styles.atsNumber, { color: scoreColor }]}>{atsScore}</Text>
                <Text style={[styles.atsTier, { color: scoreColor }]}>
                  {atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Good' : 'Needs work'}
                </Text>
                <View style={styles.atsTrack}>
                  <View style={[styles.atsFill, { width: `${atsScore}%` as any, backgroundColor: scoreColor }]} />
                </View>
              </>
            ) : primaryResume ? (
              <Text style={styles.atsAnalyzing}>✦ Analyzing…</Text>
            ) : (
              <TouchableOpacity onPress={() => router.push('/resume/upload')} style={styles.atsUploadBtn}>
                <Text style={styles.atsUploadText}>Upload CV</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Stats Column */}
          <View style={styles.statsCol}>
            {[
              { label: 'Applied', count: appStats?.by_status.applied ?? 0, color: Colors.primary },
              { label: 'Interview', count: appStats?.by_status.interview ?? 0, color: '#8B5CF6' },
              { label: 'Offer', count: appStats?.by_status.offer ?? 0, color: Colors.matchHigh },
            ].map(({ label, count, color }) => (
              <TouchableOpacity
                key={label}
                style={[styles.statChip, Shadow.sm]}
                onPress={() => router.push('/(tabs)/applications')}
                activeOpacity={0.85}
              >
                <Text style={[styles.statCount, { color }]}>{count}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Job Matches Card */}
        <TouchableOpacity
          style={[styles.card, Shadow.sm]}
          onPress={() => router.push('/(tabs)/jobs')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.primaryLight }]}>
              <Text style={styles.cardIconText}>🎯</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Job Matches</Text>
              <Text style={styles.cardSub}>Personalized for your skills</Text>
            </View>
            <View style={styles.chevronWrap}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </View>
          <View style={styles.matchPill}>
            <Text style={styles.matchPillText}>
              {primaryResume?.status === 'ready'
                ? '✦  View your top matched roles'
                : '↑  Upload your resume to unlock matches'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* AI Coach Card — Electric Blue accent */}
        <TouchableOpacity
          style={[styles.aiCard, Shadow.md]}
          onPress={() => router.push('/(tabs)/coach')}
          activeOpacity={0.85}
        >
          <View style={styles.aiOrb} />
          <View style={styles.aiAvatarWrap}>
            <Text style={styles.aiAvatarIcon}>✦</Text>
          </View>
          <View style={styles.aiCardText}>
            <Text style={styles.aiCardTitle}>AI Career Coach</Text>
            <Text style={styles.aiCardSub}>Get personalized career guidance</Text>
          </View>
          <Text style={styles.aiChevron}>›</Text>
        </TouchableOpacity>

        {/* Resume Health Card */}
        <TouchableOpacity
          style={[styles.card, Shadow.sm]}
          onPress={() => router.push('/(tabs)/resume')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.secondaryLight }]}>
              <Text style={styles.cardIconText}>📄</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Resume Health</Text>
              <Text style={styles.cardSub}>AI-powered analysis</Text>
            </View>
            <View style={styles.chevronWrap}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </View>
          {primaryResume?.status === 'processing' && (
            <Text style={styles.processingText}>✦  AI is analyzing your resume…</Text>
          )}
          {!primaryResume && (
            <TouchableOpacity
              style={styles.uploadCta}
              onPress={() => router.push('/resume/upload')}
            >
              <Text style={styles.uploadCtaText}>+ Upload resume to get started</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  /* ── Hero Header ── */
  heroHeader: {
    backgroundColor: HeroColors.base,
    paddingBottom: Spacing.lg,
    overflow: 'hidden',
  },
  heroInner: { paddingHorizontal: Spacing.lg },
  heroOrb1: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: Colors.primary, opacity: 0.3, top: -100, right: -40,
  },
  heroOrb2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.tertiaryBright, opacity: 0.12, bottom: -30, left: 20,
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { ...Typography.body, color: HeroColors.textDim },
  greetingName: { fontSize: 26, fontWeight: '800', color: HeroColors.text, lineHeight: 34, letterSpacing: -0.3 },
  greetingSub: { ...Typography.body, color: HeroColors.textDim, marginTop: 4 },

  proBadge: {
    backgroundColor: 'rgba(255,209,0,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,209,0,0.4)',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    marginTop: 4,
  },
  proBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffd700', letterSpacing: 1.2 },

  container: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },

  trialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#FEF3C7', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: '#FDE68A',
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  trialBannerIcon: { fontSize: 22 },
  trialBannerText: { flex: 1 },
  trialBannerTitle: { ...Typography.label, color: '#92400E', fontWeight: '700' },
  trialBannerSub: { ...Typography.caption, color: '#B45309', marginTop: 2 },

  /* ── ATS + Stats row ── */
  scoreRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },

  atsCard: {
    flex: 1.4, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle,
    minHeight: 130,
  },
  atsLabel: { ...Typography.caption, color: Colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  atsNumber: { fontSize: 44, fontWeight: '800', lineHeight: 52, letterSpacing: -1 },
  atsTier: { ...Typography.label, fontWeight: '700', marginBottom: 8 },
  atsTrack: { height: 6, backgroundColor: Colors.backgroundDim, borderRadius: 3, overflow: 'hidden' },
  atsFill: { height: 6, borderRadius: 3 },
  atsAnalyzing: { ...Typography.caption, color: Colors.primary, marginTop: 8 },
  atsUploadBtn: {
    marginTop: 8, backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md, paddingVertical: 8, alignItems: 'center',
  },
  atsUploadText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  statsCol: { flex: 1, gap: Spacing.xs },
  statChip: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingVertical: 10, paddingHorizontal: Spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  statCount: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  statLabel: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },

  /* ── Standard cards ── */
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: Radius.sm + 4,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  cardIconText: { fontSize: 18 },
  cardHeaderText: { flex: 1 },
  cardTitle: { ...Typography.h4, color: Colors.text },
  cardSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  chevronWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.backgroundDim,
    alignItems: 'center', justifyContent: 'center',
  },
  chevron: { fontSize: 18, color: Colors.textMuted, fontWeight: '300' },

  matchPill: {
    backgroundColor: Colors.primaryLight + '60',
    borderRadius: Radius.full, paddingVertical: 8, paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.primary + '25',
  },
  matchPillText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  processingText: { ...Typography.caption, color: Colors.primary },
  uploadCta: {
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center',
    marginTop: 4,
  },
  uploadCtaText: { ...Typography.label, color: Colors.primary },

  /* ── AI Coach card ── */
  aiCard: {
    backgroundColor: HeroColors.base,
    borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.sm, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.4)',
  },
  aiOrb: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.primary, opacity: 0.35, right: -40, top: -40,
  },
  aiAvatarWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  aiAvatarIcon: { fontSize: 18, color: Colors.tertiaryBright },
  aiCardText: { flex: 1 },
  aiCardTitle: { ...Typography.h4, color: HeroColors.text },
  aiCardSub: { ...Typography.caption, color: HeroColors.textDim, marginTop: 2 },
  aiChevron: { fontSize: 22, color: 'rgba(255,255,255,0.4)', fontWeight: '300' },
});
