import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.icon}>📧</Text>
          <Text style={styles.sentTitle}>Check your email</Text>
          <Text style={styles.sentBody}>
            We sent a 6-digit reset code to{'\n'}
            <Text style={{ fontWeight: '700' }}>{email}</Text>
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { email } })}
          >
            <Text style={styles.buttonText}>Enter reset code →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSent(false)} style={styles.resendBtn}>
            <Text style={styles.resendText}>Didn't receive it? Resend</Text>
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
            <Text style={styles.logo}>ProAICV</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a reset code.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.textInverse} />
                : <Text style={styles.buttonText}>Send reset code</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back to Sign In</Text>
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

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },

  backBtn: { alignItems: 'center', marginTop: Spacing.lg },
  backText: { ...Typography.body, color: Colors.textSecondary },

  // sent state
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  icon: { fontSize: 56, marginBottom: Spacing.lg },
  sentTitle: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  sentBody: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  resendBtn: { marginTop: Spacing.md },
  resendText: { ...Typography.body, color: Colors.primary },
});
