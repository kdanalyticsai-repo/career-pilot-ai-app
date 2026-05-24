import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

const SUPPORT_EMAIL = 'info@kdaanalytics.com';
const WEBSITE_URL = 'https://cvpilot.kdaanalytics.com';

const features = [
  { icon: '🤖', title: 'AI Career Coach', desc: 'Chat with an AI coach for personalised career advice and job search guidance.' },
  { icon: '📄', title: 'Resume Tailoring', desc: 'Instantly tailor your resume to any job description to beat ATS filters.' },
  { icon: '✉️', title: 'Cover Letter Generator', desc: 'Generate compelling, job-specific cover letters in seconds.' },
  { icon: '🎤', title: 'Interview Prep', desc: 'Practice with AI-generated questions based on the role and your resume.' },
  { icon: '🏢', title: 'Job Listings', desc: 'Browse verified job listings from trusted companies across India.' },
];

export default function AboutScreen() {
  const openEmail = () =>
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() =>
      Alert.alert('Error', 'Could not open email client.')
    );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'About ProAICV', headerBackTitle: 'Back' }} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroOrb} />
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>✦</Text>
          </View>
          <Text style={styles.appName}>ProAICV</Text>
          <Text style={styles.tagline}>Your AI-powered career companion</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        {/* About */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionLabel}>About the App</Text>
          <Text style={styles.body}>
            ProAICV is an AI-powered career platform built to help job seekers in India land their next opportunity faster. From resume tailoring and cover letter generation to interview preparation and AI coaching — everything you need is in one place.
          </Text>
          <Text style={[styles.body, { marginTop: Spacing.sm }]}>
            For employers, ProAICV makes hiring simple — post jobs, review applicants, and connect with pre-screened candidates effortlessly.
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionLabel}>Key Features</Text>
          {features.map((f, i) => (
            <View key={f.title} style={[styles.featureRow, i < features.length - 1 && styles.featureDivider]}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Developer */}
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionLabel}>Developer</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Company</Text>
            <Text style={styles.detailValue}>KDA Analytics</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <TouchableOpacity onPress={openEmail}>
              <Text style={[styles.detailValue, { color: Colors.primary }]}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Platform</Text>
            <Text style={styles.detailValue}>Android · iOS</Text>
          </View>
        </View>

        {/* Legal note */}
        <Text style={styles.legal}>
          © 2026 KDA Analytics. All rights reserved.{'\n'}
          ProAICV is a product of KDA Analytics, India.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { paddingBottom: Spacing.xxl, gap: Spacing.sm },

  hero: {
    backgroundColor: HeroColors.base,
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  heroOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.primary, opacity: 0.25, top: -60, right: -40,
  },
  logoWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  logoText: { fontSize: 30, color: Colors.textInverse },
  appName: { fontSize: 26, fontWeight: '800', color: HeroColors.text, letterSpacing: -0.5 },
  tagline: { ...Typography.body, color: HeroColors.textDim, marginTop: 4 },
  versionBadge: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  versionText: { ...Typography.caption, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginHorizontal: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  body: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm },
  featureDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: Radius.sm + 2,
    backgroundColor: Colors.surfaceLow,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  featureIcon: { fontSize: 16 },
  featureTitle: { ...Typography.label, color: Colors.text, fontWeight: '600' },
  featureDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  detailLabel: { ...Typography.body, color: Colors.textSecondary },
  detailValue: { ...Typography.body, color: Colors.text, fontWeight: '500' },

  legal: {
    ...Typography.caption, color: Colors.textMuted,
    textAlign: 'center', lineHeight: 18,
    marginHorizontal: Spacing.lg, marginTop: Spacing.xs,
  },
});
