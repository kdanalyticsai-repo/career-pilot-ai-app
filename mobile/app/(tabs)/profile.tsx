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

  const rows: { label: string; icon: string; route: string }[] = [
    { label: 'Edit Profile', icon: '✏️', route: '/profile/edit' },
    { label: 'Notification Settings', icon: '🔔', route: '/profile/notifications' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, Shadow.sm]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user?.subscription?.toUpperCase() ?? 'FREE'}</Text>
          </View>
        </View>

        <View style={[styles.menuCard, Shadow.sm]}>
          {rows.map(({ label, icon, route }, i) => (
            <TouchableOpacity
              key={route}
              style={[styles.menuRow, i < rows.length - 1 && styles.menuRowBorder]}
              onPress={() => router.push(route as any)}
            >
              <Text style={styles.menuIcon}>{icon}</Text>
              <Text style={styles.menuLabel}>{label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary, justifyContent: 'center',
    alignItems: 'center', marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.textInverse },
  name: { ...Typography.h3, color: Colors.text, marginBottom: 4 },
  email: { ...Typography.body, color: Colors.textSecondary, marginBottom: 4 },
  phone: { ...Typography.bodySmall, color: Colors.textMuted, marginBottom: Spacing.sm },
  badge: {
    backgroundColor: Colors.primary + '20', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  badgeText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  menuCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.md, overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon: { fontSize: 18, width: 28 },
  menuLabel: { ...Typography.label, color: Colors.text, flex: 1 },
  menuChevron: { fontSize: 20, color: Colors.textMuted },
  logoutBtn: {
    borderWidth: 1, borderColor: Colors.danger, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  logoutText: { ...Typography.label, color: Colors.danger },
});
