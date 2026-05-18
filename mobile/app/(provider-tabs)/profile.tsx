import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function ProviderProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.name
    ?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={[styles.profileCard, Shadow.md]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'Provider'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>🏢 JOB PROVIDER</Text>
          </View>
        </View>

        <View style={[styles.infoCard, Shadow.sm]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account type</Text>
            <Text style={styles.infoValue}>Job Provider</Text>
          </View>
          <View style={[styles.infoRow, styles.rowBorder]}>
            <Text style={styles.infoLabel}>Plan</Text>
            <Text style={styles.infoValue}>Free</Text>
          </View>
          <View style={[styles.infoRow, styles.rowBorder]}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>CVProAI v1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  profileCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.primaryLight,
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.textInverse },
  name: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  email: { ...Typography.body, color: Colors.textSecondary },
  roleBadge: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary + '30',
    paddingHorizontal: Spacing.md, paddingVertical: 6, marginTop: Spacing.sm,
  },
  roleBadgeText: { ...Typography.caption, color: Colors.primary, letterSpacing: 0.5 },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  infoLabel: { ...Typography.body, color: Colors.textSecondary },
  infoValue: { ...Typography.label, color: Colors.text },
  logoutBtn: {
    borderWidth: 1.5, borderColor: Colors.danger + '60',
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.danger + '08',
  },
  logoutText: { ...Typography.label, color: Colors.danger },
});
