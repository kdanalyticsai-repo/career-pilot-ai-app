import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (!otp.trim() || otp.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email?.trim().toLowerCase(),
        otp: otp.trim(),
        new_password: password,
      });
      setDone(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string' && detail.toLowerCase().includes('expired')) {
        setError('This code has expired. Please request a new one.');
      } else if (typeof detail === 'string' && detail.toLowerCase().includes('invalid')) {
        setError('Incorrect code. Please check your email and try again.');
      } else {
        setError('Could not reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.successIconWrap}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Password updated!</Text>
          <Text style={styles.doneBody}>
            Your password has been reset successfully.{'\n'}Sign in with your new password to continue.
          </Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.signInBtnText}>Continue to Sign In</Text>
            <Text style={styles.signInBtnArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>CVProAI</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={{ fontWeight: '700' }}>{email}</Text>
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reset code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                value={otp}
                onChangeText={(t) => { setOtp(t); setError(''); }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 8 characters"
                secureTextEntry
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeat your new password"
                secureTextEntry
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(''); }}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.textInverse} />
                : <Text style={styles.buttonText}>Reset password</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { ...Typography.h1, color: Colors.primary },

  form: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  title: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 22 },

  errorBox: {
    backgroundColor: Colors.danger + '12', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.danger + '40',
    paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.sm,
  },
  errorBoxText: { ...Typography.body, color: Colors.danger, textAlign: 'center' },

  fieldGroup: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.text, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.background,
  },
  otpInput: { letterSpacing: 6, fontSize: 22, fontWeight: '700', textAlign: 'center' },

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },

  backBtn: { alignItems: 'center', marginTop: Spacing.lg },
  backText: { ...Typography.body, color: Colors.textSecondary },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.success + '18',
    borderWidth: 2, borderColor: Colors.success + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  icon: { fontSize: 36, color: Colors.success, fontWeight: '800' },
  doneTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  doneBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  signInBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 16, paddingHorizontal: Spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  signInBtnText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },
  signInBtnArrow: { fontSize: 18, color: Colors.textInverse, fontWeight: '700' },
});
