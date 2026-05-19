import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

type PlanId = 'monthly' | 'quarterly' | 'yearly';

const PLANS: {
  id: PlanId;
  label: string;
  price: string;
  per: string;
  savings: string | null;
  badge: string | null;
}[] = [
  { id: 'monthly',   label: 'Monthly',   price: '₹199',   per: '/month',   savings: null,      badge: null           },
  { id: 'quarterly', label: 'Quarterly', price: '₹499',   per: '/quarter', savings: 'Save ₹98', badge: 'MOST POPULAR' },
  { id: 'yearly',    label: 'Yearly',    price: '₹1,499', per: '/year',    savings: 'Save ₹889', badge: 'BEST VALUE'  },
];

const PRO_FEATURES = [
  { label: 'Up to 5 resumes' },
  { label: 'Unlimited job matches' },
  { label: 'Full ATS score breakdown' },
  { label: 'Unlimited interview prep' },
  { label: 'Unlimited cover letters' },
  { label: '10 resume tailorings / month' },
  { label: 'Unlimited application tracking' },
  { label: 'AI Career Coach (unlimited)', highlight: true },
  { label: '24h email support' },
];

function getTrialDaysLeft(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function PaywallScreen() {
  const { user, setUser } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('quarterly');
  const [isLoading, setIsLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const isPro = user?.subscription === 'pro';
  const trialDaysLeft = getTrialDaysLeft(user?.trial_ends_at);
  const activePlan = PLANS.find((p) => p.id === selectedPlan)!;

  async function pollForProUpgrade(): Promise<boolean> {
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const updated = await authService.getMe().catch(() => null);
      if (updated?.subscription === 'pro') {
        setUser(updated);
        return true;
      }
    }
    return false;
  }

  async function handleUpgrade() {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/subscriptions/payment-url?plan=${selectedPlan}`);
      await WebBrowser.openAuthSessionAsync(data.url, 'cvpilot://');

      setIsLoading(false);
      setVerifyingPayment(true);
      const upgraded = await pollForProUpgrade();
      setVerifyingPayment(false);

      if (upgraded) {
        router.replace('/(tabs)/profile');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      let message = 'Something went wrong. Please try again in a moment.';
      if (status === 401 || status === 403) {
        message = 'Your session has expired. Please log out and log back in, then try again.';
      } else if (status === 400) {
        message = 'You are already on the Pro plan!';
      } else if (!status) {
        message = 'No internet connection. Please check your network and try again.';
      }
      Alert.alert('Could Not Open Payment', message);
    } finally {
      setIsLoading(false);
      setVerifyingPayment(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Trial banner */}
        {trialDaysLeft !== null && trialDaysLeft > 0 && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialBannerText}>
              🎉 You have <Text style={{ fontWeight: '800' }}>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</Text> left on your free trial
            </Text>
          </View>
        )}
        {trialDaysLeft === 0 && (
          <View style={[styles.trialBanner, styles.trialBannerExpired]}>
            <Text style={[styles.trialBannerText, { color: Colors.danger }]}>
              ⏰ Your free trial has ended — upgrade to keep full access
            </Text>
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>✦</Text>
          </View>
          <Text style={styles.heroTitle}>Apply smarter. Get hired faster.</Text>
          <Text style={styles.heroSub}>
            Upgrade to Pro and get unlimited AI coaching, job matching, and resume tools.
          </Text>
        </View>

        {/* Plan selector */}
        <Text style={styles.sectionLabel}>Choose your plan</Text>
        <View style={styles.planList}>
          {PLANS.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
              >
                {/* Radio dot */}
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>

                {/* Plan name + badge */}
                <View style={styles.planInfo}>
                  <View style={styles.planNameRow}>
                    <Text style={[styles.planName, selected && styles.planNameSelected]}>
                      {plan.label}
                    </Text>
                    {plan.badge && (
                      <View style={[styles.planBadge, plan.badge === 'MOST POPULAR' ? styles.planBadgePopular : styles.planBadgeBest]}>
                        <Text style={styles.planBadgeText}>{plan.badge}</Text>
                      </View>
                    )}
                  </View>
                  {plan.savings && (
                    <Text style={styles.planSavings}>{plan.savings}</Text>
                  )}
                </View>

                {/* Price */}
                <View style={styles.planPriceWrap}>
                  <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>{plan.price}</Text>
                  <Text style={styles.planPer}>{plan.per}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Pro features */}
        <View style={[styles.featuresCard, Shadow.sm]}>
          <Text style={styles.featuresTitle}>Everything in Pro</Text>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={[styles.featureCheck, f.highlight && { color: Colors.tertiary }]}>✓</Text>
              <Text style={[styles.featureLabel, f.highlight && styles.featureLabelHighlight]}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        {isPro ? (
          <View style={[styles.alreadyPro, Shadow.sm]}>
            <Text style={styles.alreadyProIcon}>✦</Text>
            <Text style={styles.alreadyProText}>You're already on Pro!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.upgradeBtn, (isLoading || verifyingPayment) && { opacity: 0.7 }]}
            onPress={handleUpgrade}
            disabled={isLoading || verifyingPayment}
            activeOpacity={0.85}
          >
            {verifyingPayment ? (
              <>
                <ActivityIndicator color={Colors.textInverse} />
                <Text style={[styles.upgradeBtnSub, { marginTop: 8 }]}>Verifying payment…</Text>
              </>
            ) : isLoading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Text style={styles.upgradeBtnText}>
                  Upgrade to Pro — {activePlan.price}{activePlan.per}
                </Text>
                <Text style={styles.upgradeBtnSub}>Pay via UPI, Card, or Net Banking</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Payment processed securely via Razorpay.{'\n'}
          After payment, return to the app to activate Pro.{'\n'}
          Renew manually before expiry to keep access.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  headerWrap: { alignItems: 'flex-end', marginBottom: Spacing.sm },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '700' },

  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  heroIconText: { fontSize: 32, color: Colors.textInverse },
  heroTitle: { ...Typography.h2, color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  heroSub: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  sectionLabel: { ...Typography.label, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.sm },

  planList: { gap: Spacing.sm, marginBottom: Spacing.lg },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border,
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },

  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },

  planInfo: { flex: 1 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  planName: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  planNameSelected: { color: Colors.primary },
  planBadge: { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  planBadgePopular: { backgroundColor: Colors.primary + '20' },
  planBadgeBest: { backgroundColor: Colors.tertiary + '30' },
  planBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.primary, letterSpacing: 0.4 },
  planSavings: { ...Typography.caption, color: Colors.success, fontWeight: '600', marginTop: 2 },

  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { ...Typography.label, color: Colors.text, fontWeight: '700', fontSize: 16 },
  planPriceSelected: { color: Colors.primary },
  planPer: { ...Typography.caption, color: Colors.textMuted },

  featuresCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  featuresTitle: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  featureCheck: { fontSize: 13, fontWeight: '700', color: Colors.success, marginTop: 1, width: 16 },
  featureLabel: { ...Typography.body, color: Colors.text, flex: 1, lineHeight: 20 },
  featureLabelHighlight: { fontWeight: '700', color: Colors.tertiary },

  upgradeBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center',
    marginBottom: Spacing.md, ...Shadow.md,
  },
  upgradeBtnText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },
  upgradeBtnSub: { ...Typography.caption, color: Colors.textInverse + 'cc', marginTop: 4 },

  alreadyPro: {
    backgroundColor: Colors.tertiary + '20', borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.tertiary + '40',
    marginBottom: Spacing.md,
  },
  alreadyProIcon: { fontSize: 20, color: Colors.tertiary },
  alreadyProText: { ...Typography.label, color: Colors.tertiary },

  disclaimer: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  trialBanner: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30',
  },
  trialBannerExpired: {
    backgroundColor: Colors.danger + '10', borderColor: Colors.danger + '30',
  },
  trialBannerText: { ...Typography.body, color: Colors.primary, textAlign: 'center' },
});
