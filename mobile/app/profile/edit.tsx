import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.patch('/users/me', { name: name.trim(), phone: phone.trim() || null });
      setUser(res.data);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
        </View>

        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 9999999999"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{user?.email}</Text>
          </View>
          <Text style={styles.fieldHint}>Email cannot be changed.</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, justifyContent: 'center',
    alignItems: 'center', alignSelf: 'center', marginBottom: Spacing.lg,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.textInverse },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  fieldLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.sm },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...Typography.body, color: Colors.text,
  },
  readonlyField: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  readonlyText: { ...Typography.body, color: Colors.textSecondary },
  fieldHint: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  saveBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '600' },
});
