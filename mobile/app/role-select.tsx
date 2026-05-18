import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function RoleSelectScreen() {
  const { setPendingRole } = useAuthStore();

  const handleSelect = (role: 'job_seeker' | 'job_provider') => {
    setPendingRole(role);
    router.push('/(auth)/register');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>CVProAI</Text>
          <Text style={styles.tagline}>Apply smarter. Get hired faster.</Text>
        </View>

        {/* Role selection */}
        <Text style={styles.prompt}>I am a...</Text>

        <View style={styles.cards}>
          {/* Job Seeker */}
          <TouchableOpacity
            style={[styles.card, Shadow.md]}
            onPress={() => handleSelect('job_seeker')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardTitle}>Job Seeker</Text>
            <Text style={styles.cardDesc}>
              Find jobs, get AI resume coaching, tailored cover letters & interview prep
            </Text>
            <View style={styles.cardBtn}>
              <Text style={styles.cardBtnText}>Find a Job →</Text>
            </View>
          </TouchableOpacity>

          {/* Job Provider */}
          <TouchableOpacity
            style={[styles.card, styles.cardProvider, Shadow.md]}
            onPress={() => handleSelect('job_provider')}
            activeOpacity={0.85}
          >
            <Text style={styles.cardIcon}>🏢</Text>
            <Text style={styles.cardTitle}>Job Provider</Text>
            <Text style={styles.cardDesc}>
              Post job listings, manage requirements, and connect with qualified candidates
            </Text>
            <View style={[styles.cardBtn, styles.cardBtnProvider]}>
              <Text style={[styles.cardBtnText, { color: Colors.primary }]}>Hire Talent →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign in link */}
        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1, paddingHorizontal: Spacing.lg,
    justifyContent: 'center', gap: Spacing.lg,
  },

  logoWrap: { alignItems: 'center', marginBottom: Spacing.sm },
  logo: { ...Typography.h1, color: Colors.primary, fontSize: 32, letterSpacing: -0.5 },
  tagline: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },

  prompt: { ...Typography.h4, color: Colors.textSecondary, textAlign: 'center' },

  cards: { gap: Spacing.md },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  cardProvider: {
    borderColor: Colors.primary + '30',
    backgroundColor: Colors.primaryLight + '30',
  },

  cardIcon: { fontSize: 32 },
  cardTitle: { ...Typography.h3, color: Colors.text },
  cardDesc: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20 },

  cardBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 10, paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start', marginTop: Spacing.xs,
  },
  cardBtnProvider: {
    backgroundColor: Colors.primaryLight,
  },
  cardBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  signinRow: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  signinText: { ...Typography.body, color: Colors.textSecondary },
  signinLink: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
});
