import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

const FREE_FEATURES = [
  { label: '1 resume upload', included: true },
  { label: '20 job matches per day', included: true },
  { label: 'Basic ATS score', included: true },
  { label: '1 interview prep / month', included: true },
  { label: '1 cover letter / month', included: true },
  { label: '1 resume tailoring / month', included: true },
  { label: 'Track up to 10 applications', included: true },
  { label: 'AI Career Coach chat', included: false },
  { label: 'Unlimited job matches', included: false },
  { label: 'Unlimited interview prep', included: false },
];

const PRO_FEATURES = [
  { label: 'Up to 5 resumes', included: true },
  { label: 'Unlimited job matches', included: true },
  { label: 'Full ATS score breakdown', included: true },
  { label: 'Unlimited interview prep', included: true },
  { label: 'Unlimited cover letters', included: true },
  { label: '10 resume tailorings / month', included: true },
  { label: 'Unlimited application tracking', included: true },
  { label: 'AI Career Coach chat (unlimited)', included: true, highlight: true },
  { label: 'Priority support', included: true },
];

export default function PaywallScreen() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { mutate: upgrade, isPending } = useMutation({
    mutationFn: () => api.post('/subscriptions/upgrade', {}),
    onSuccess: (res) => {
      if (user) {
        setUser({ ...user, subscription: 'pro' });
      }
      queryClient.invalidateQueries({ queryKey: ['my-usage'] });
      Alert.alert(
        'Welcome to Pro!',
        'You now have access to all Pro features including unlimited AI Career Coach.',
        [{ text: 'Awesome!', onPress: () => router.back() }],
      );
    },
    onError: () => {
      Alert.alert('Error', 'Could not process upgrade. Please try again.');
    },
  });

  const isPro = user?.subscription === 'pro';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>✦</Text>
          </View>
          <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
          <Text style={styles.heroSub}>
            Upgrade to Pro and get unlimited AI coaching, job matching, and resume tools.
          </Text>
        </View>

        {/* Price card */}
        <View style={[styles.priceCard, Shadow.md]}>
          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>₹199</Text>
            <Text style={styles.pricePer}>/month</Text>
          </View>
          <Text style={styles.priceSub}>Cancel anytime · No hidden fees</Text>
          <View style={styles.priceDivider} />
          <Text style={styles.priceCompare}>
            vs LinkedIn Premium at ₹1,999/month — 10× cheaper
          </Text>
        </View>

        {/* Plan comparison */}
        <View style={styles.plansRow}>
          {/* Free */}
          <View style={[styles.planCard, Shadow.sm]}>
            <Text style={styles.planName}>Free</Text>
            <Text style={styles.planPrice}>₹0</Text>
            {FREE_FEATURES.map((f) => (
              <FeatureRow key={f.label} label={f.label} included={f.included} />
            ))}
          </View>

          {/* Pro */}
          <View style={[styles.planCard, styles.planCardPro, Shadow.md]}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>RECOMMENDED</Text>
            </View>
            <Text style={[styles.planName, { color: Colors.textInverse }]}>Pro</Text>
            <Text style={[styles.planPrice, { color: Colors.textInverse }]}>₹199/mo</Text>
            {PRO_FEATURES.map((f) => (
              <FeatureRow
                key={f.label}
                label={f.label}
                included={f.included}
                highlight={f.highlight}
                dark
              />
            ))}
          </View>
        </View>

        {/* CTA */}
        {isPro ? (
          <View style={[styles.alreadyPro, Shadow.sm]}>
            <Text style={styles.alreadyProIcon}>✦</Text>
            <Text style={styles.alreadyProText}>You're already on Pro!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.upgradeBtn, isPending && { opacity: 0.7 }]}
            onPress={() => upgrade()}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <>
                <Text style={styles.upgradeBtnText}>Upgrade to Pro — ₹199/month</Text>
                <Text style={styles.upgradeBtnSub}>Instant access · Cancel anytime</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Subscription managed through Google Play. Billed monthly.
          {'\n'}By upgrading you agree to our Terms of Service.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({
  label, included, highlight, dark,
}: {
  label: string; included: boolean; highlight?: boolean; dark?: boolean;
}) {
  const textColor = dark
    ? included ? Colors.textInverse : Colors.textInverse + '60'
    : included ? Colors.text : Colors.textMuted;

  return (
    <View style={styles.featureRow}>
      <Text style={[styles.featureCheck, { color: included ? (highlight ? Colors.tertiary : (dark ? Colors.textInverse : Colors.success)) : Colors.textMuted }]}>
        {included ? '✓' : '✗'}
      </Text>
      <Text style={[
        styles.featureLabel,
        { color: textColor },
        highlight && { fontWeight: '700' },
      ]}>
        {label}
      </Text>
    </View>
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

  priceCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderSubtle,
    marginBottom: Spacing.lg,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  priceAmount: { fontSize: 48, fontWeight: '800', color: Colors.primary, lineHeight: 56 },
  pricePer: { ...Typography.body, color: Colors.textSecondary, marginBottom: 8 },
  priceSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
  priceDivider: { width: 40, height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  priceCompare: { ...Typography.caption, color: Colors.tertiary, fontWeight: '600', textAlign: 'center' },

  plansRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  planCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  planCardPro: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  proBadge: {
    backgroundColor: Colors.tertiary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: Spacing.sm,
  },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.text, letterSpacing: 0.5 },
  planName: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  planPrice: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  featureCheck: { fontSize: 12, fontWeight: '700', marginTop: 1, width: 14 },
  featureLabel: { ...Typography.caption, flex: 1, lineHeight: 18 },

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
});
