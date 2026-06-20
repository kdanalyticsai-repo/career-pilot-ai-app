import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

const SEEKER_IMAGE = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&h=600&fit=crop&crop=top&q=80';
const PROVIDER_IMAGE = 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=700&h=360&fit=crop&q=80';

const SEEKER_FEATURES = [
  { icon: '🎯', text: 'AI-matched jobs tailored to your resume' },
  { icon: '📄', text: 'ATS resume scorer with improvement tips' },
  { icon: '🤖', text: 'Unlimited AI career coach & interview prep' },
];

const PROVIDER_FEATURES = [
  { icon: '📢', text: 'Post jobs with full specifications instantly' },
  { icon: '👥', text: 'Manage applicants from one clean dashboard' },
  { icon: '✅', text: 'Admin-verified listings for quality reach' },
];

export default function RoleSelectScreen() {
  const { setPendingRole } = useAuthStore();

  const handleSelect = (role: 'job_seeker' | 'job_provider') => {
    setPendingRole(role);
    router.push('/(auth)/register');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={HeroColors.base} />

      {/* ── Hero ─────────────────────────────────────── */}
      <View style={styles.hero}>
        {/* Mesh orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />
        <View style={styles.orb3} />

        <SafeAreaView edges={['top']} style={styles.heroInner}>

          <View style={styles.logoMark}>
            <Text style={styles.logoMarkIcon}>✦</Text>
          </View>
          <Text style={styles.logoText}>ProAICV</Text>
          <Text style={styles.heroTagline}>Your AI-powered career platform</Text>

          <View style={styles.pillRow}>
            {['Resume AI', 'Job Match', 'Career Coach'].map((p) => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </View>

      {/* ── Cards ────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeading}>How would you like to get started?</Text>

        {/* Job Seeker Card */}
        <View style={[styles.card, Shadow.md]}>
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: SEEKER_IMAGE }}
              style={styles.cardImage}
              contentFit="cover"
              contentPosition="top"
              placeholder={{ color: Colors.primary + '30' }}
              transition={400}
            />
            <View style={[styles.imageOverlay, { backgroundColor: 'rgba(27,0,96,0.78)' }]}>
              <View style={styles.overlayBadge}>
                <Text style={styles.overlayBadgeText}>👤  Job Seeker</Text>
              </View>
              <Text style={styles.overlayTitle}>Land your{'\n'}next opportunity</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {SEEKER_FEATURES.map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <View style={[styles.featureIconWrap, { backgroundColor: Colors.primaryLight }]}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cardCTA, { backgroundColor: Colors.primary }]}
            onPress={() => handleSelect('job_seeker')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardCTAText}>Find Jobs</Text>
            <Text style={styles.cardCTAArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Job Provider Card */}
        <View style={[styles.card, Shadow.md]}>
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: PROVIDER_IMAGE }}
              style={styles.cardImage}
              contentFit="cover"
              placeholder={{ color: Colors.tertiaryContainer + '30' }}
              transition={400}
            />
            <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,30,40,0.80)' }]}>
              <View style={[styles.overlayBadge, { backgroundColor: 'rgba(0,174,196,0.2)', borderColor: 'rgba(0,209,255,0.35)' }]}>
                <Text style={styles.overlayBadgeText}>🏢  Job Provider</Text>
              </View>
              <Text style={styles.overlayTitle}>Find the right{'\n'}candidates</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {PROVIDER_FEATURES.map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <View style={[styles.featureIconWrap, { backgroundColor: Colors.tertiaryBright + '18' }]}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cardCTA, { backgroundColor: Colors.tertiaryContainer }]}
            onPress={() => handleSelect('job_provider')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardCTAText}>Hire Talent</Text>
            <Text style={styles.cardCTAArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  /* ── Hero ── */
  hero: { backgroundColor: HeroColors.base, paddingBottom: Spacing.xl, overflow: 'hidden' },
  heroInner: { alignItems: 'center', paddingHorizontal: Spacing.lg },

  orb1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: Colors.primary, opacity: 0.28, top: -120, right: -80,
  },
  orb2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.tertiaryBright, opacity: 0.12, bottom: -60, left: -40,
  },
  orb3: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.secondary, opacity: 0.15, top: 40, left: 20,
  },

  logoMark: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: HeroColors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: HeroColors.border,
    ...Shadow.lg,
    shadowColor: Colors.primary,
  },
  logoMarkIcon: { fontSize: 30, color: HeroColors.text },
  logoText: { fontSize: 34, fontWeight: '800', color: HeroColors.text, letterSpacing: -0.6 },
  heroTagline: { ...Typography.body, color: HeroColors.textDim, marginTop: 6, marginBottom: Spacing.lg },

  pillRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    backgroundColor: HeroColors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderWidth: 1, borderColor: HeroColors.border,
  },
  pillText: { ...Typography.caption, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  /* ── Cards ── */
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },

  sectionHeading: {
    ...Typography.h4, color: Colors.text,
    textAlign: 'center', marginBottom: 4,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },

  imageWrap: { height: 210, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.md,
    justifyContent: 'flex-end',
  },
  overlayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  overlayBadgeText: { ...Typography.caption, color: '#ffffff', fontWeight: '700' },
  overlayTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', lineHeight: 28, letterSpacing: -0.3 },

  cardBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featureIcon: { fontSize: 14 },
  featureText: { ...Typography.body, color: Colors.textSecondary, flex: 1, lineHeight: 20 },

  cardCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  cardCTAText: { ...Typography.label, color: '#ffffff', fontSize: 15, fontWeight: '700' },
  cardCTAArrow: { fontSize: 17, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },

  signInRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: Spacing.md,
  },
  signInText: { ...Typography.body, color: Colors.textSecondary },
  signInLink: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
});
