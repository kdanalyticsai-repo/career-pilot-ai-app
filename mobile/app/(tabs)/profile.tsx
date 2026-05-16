import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function ProfileTab() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const rows: { label: string; icon: string; route: string; sub?: string }[] = [
    { label: 'Edit Profile', icon: '✏️', route: '/profile/edit', sub: 'Update your information' },
    { label: 'Notification Settings', icon: '🔔', route: '/profile/notifications', sub: 'Manage alerts' },
  ];

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Profile Header Card */}
        <View style={[styles.profileCard, Shadow.md]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.name}>{user?.name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>✦ {user?.subscription?.toUpperCase() ?? 'FREE'} PLAN</Text>
          </View>
        </View>

        {/* Settings Card */}
        <View style={[styles.menuCard, Shadow.sm]}>
          {rows.map(({ label, icon, route, sub }, i) => (
            <TouchableOpacity
              key={route}
              style={[styles.menuRow, i < rows.length - 1 && styles.menuRowBorder]}
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
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={[styles.menuCard, Shadow.sm]}>
          <View style={styles.menuRow}>
            <View style={styles.menuIconWrap}>
              <Text style={styles.menuIcon}>ℹ️</Text>
            </View>
            <View style={styles.menuLabelWrap}>
              <Text style={styles.menuLabel}>App Version</Text>
              <Text style={styles.menuSub}>CVPilot v1.0.0</Text>
            </View>
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
  avatarWrap: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.primaryLight,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.textInverse },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.tertiary,
    borderWidth: 2, borderColor: Colors.surface,
  },
  name: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  email: { ...Typography.body, color: Colors.textSecondary, marginBottom: 4 },
  phone: { ...Typography.bodySmall, color: Colors.textMuted, marginBottom: Spacing.sm },
  planBadge: {
    backgroundColor: Colors.primaryLight + '50',
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '30',
    paddingHorizontal: Spacing.md, paddingVertical: 6, marginTop: Spacing.sm,
  },
  planBadgeText: { ...Typography.caption, color: Colors.primary, letterSpacing: 0.5 },

  menuCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIcon: { fontSize: 16 },
  menuLabelWrap: { flex: 1 },
  menuLabel: { ...Typography.label, color: Colors.text },
  menuSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 1 },
  menuChevron: { fontSize: 20, color: Colors.textMuted, fontWeight: '300' },

  logoutBtn: {
    borderWidth: 1.5, borderColor: Colors.danger + '60',
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.danger + '08',
  },
  logoutText: { ...Typography.label, color: Colors.danger },
});
