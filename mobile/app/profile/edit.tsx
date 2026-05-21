import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const isProvider = user?.role === 'job_provider';

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [companyPan, setCompanyPan] = useState(user?.company_pan ?? '');
  const [companyRegNo, setCompanyRegNo] = useState(user?.company_reg_no ?? '');
  const [gstin, setGstin] = useState(user?.gstin ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    if (isProvider && companyPan.trim() && !PAN_REGEX.test(companyPan.trim().toUpperCase())) {
      Alert.alert('Invalid PAN', 'Company PAN must be in the format AAAAA9999A (5 letters, 4 digits, 1 letter).');
      return;
    }
    if (isProvider && gstin.trim() && !GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
      Alert.alert('Invalid GSTIN', 'GSTIN must be 15 characters in the standard format (e.g. 22AAAAA0000A1Z5).');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        name: name.trim(),
        phone: phone.trim() || null,
      };
      if (isProvider) {
        payload.company_pan = companyPan.trim().toUpperCase() || null;
        payload.company_reg_no = companyRegNo.trim() || null;
        payload.gstin = gstin.trim().toUpperCase() || null;
      }
      const res = await apiClient.patch('/users/me', payload);
      setUser(res.data);
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
        </View>

        {/* Personal Info */}
        <Text style={styles.sectionLabel}>Personal Information</Text>
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.fieldLabel}>Full Name *</Text>
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

        {/* Provider-only: Company Verification */}
        {isProvider ? (
          <>
            <Text style={styles.sectionLabel}>Company Verification</Text>
            <View style={[styles.card, Shadow.sm]}>
              <Text style={styles.fieldLabel}>Company PAN *</Text>
              <TextInput
                style={styles.input}
                value={companyPan}
                onChangeText={(t) => setCompanyPan(t.toUpperCase())}
                placeholder="AAAAA9999A"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={10}
              />
              <Text style={styles.fieldHint}>Format: 5 letters · 4 digits · 1 letter (e.g. ABCDE1234F)</Text>

              <Text style={styles.fieldLabel}>Company Registration No. (CIN)</Text>
              <TextInput
                style={styles.input}
                value={companyRegNo}
                onChangeText={setCompanyRegNo}
                placeholder="Optional — e.g. U74999DL2020OPC123456"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />

              <Text style={styles.fieldLabel}>GSTIN</Text>
              <TextInput
                style={styles.input}
                value={gstin}
                onChangeText={(t) => setGstin(t.toUpperCase())}
                placeholder="Optional — e.g. 22AAAAA0000A1Z5"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={15}
              />

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️  Details are reviewed by the ProAICV team. Once verified, a badge appears on your profile.
                  {user?.pan_verified
                    ? '\n\n✓ Your PAN is currently verified.'
                    : user?.company_pan
                    ? '\n\n⏳ Verification pending. Editing PAN will reset verification.'
                    : ''}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <TouchableOpacity style={[styles.saveBtn, Shadow.sm]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
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

  sectionLabel: {
    ...Typography.caption, color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: Spacing.sm, marginLeft: 4,
  },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  fieldLabel: {
    ...Typography.label, color: Colors.textSecondary,
    marginBottom: 6, marginTop: Spacing.sm,
  },
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

  infoBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  infoText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18 },

  saveBtn: {
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
    backgroundColor: HeroColors.base,
    marginHorizontal: Spacing.sm,
  },
  saveBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
});
