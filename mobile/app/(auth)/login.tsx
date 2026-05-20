import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login, isLoading, pendingRole } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const isProvider = pendingRole === 'job_provider';
  const tagline = isProvider ? 'List smarter. Hire faster.' : 'Apply smarter. Get hired faster.';

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      const status = err?.response?.status;
      if (!status) {
        setErrorMsg('No internet connection. Please check your network and try again.');
      } else if (status === 401 || status === 422) {
        setErrorMsg('Incorrect email or password. Please check your details and try again.');
      } else if (status === 429) {
        setErrorMsg('Too many sign-in attempts. Please wait a moment and try again.');
      } else if (status >= 500) {
        setErrorMsg('Our servers are having trouble. Please try again in a few minutes.');
      } else {
        setErrorMsg('Sign in failed. Please try again.');
      }
    }
  };

  return (
    <View style={styles.root}>
      {/* Background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkIcon}>✦</Text>
              </View>
              <Text style={styles.logo}>CVProAI</Text>
              <Text style={styles.tagline}>{tagline}</Text>
            </View>

            {/* Glass form card */}
            <View style={styles.card}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue your career journey</Text>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorBoxText}>{errorMsg}</Text>
                </View>
              ) : null}

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email address</Text>
                    <TextInput
                      style={[styles.input, errors.email && styles.inputError]}
                      placeholder="you@example.com"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onChangeText={(t) => { onChange(t); setErrorMsg(''); }}
                      onBlur={onBlur}
                      value={value}
                    />
                    {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={[styles.input, errors.password && styles.inputError]}
                      placeholder="Enter your password"
                      placeholderTextColor={Colors.textMuted}
                      secureTextEntry
                      onChangeText={(t) => { onChange(t); setErrorMsg(''); }}
                      onBlur={onBlur}
                      value={value}
                    />
                    {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
                  </View>
                )}
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={styles.buttonText}>Sign In</Text>}
              </TouchableOpacity>

              <Link href="/(auth)/forgot-password" style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Link>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register">
                <Text style={styles.link}>Sign Up</Text>
              </Link>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  flex: { flex: 1 },

  orb1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: Colors.primary, opacity: 0.07, top: -140, right: -80,
  },
  orb2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.tertiaryBright, opacity: 0.05, bottom: 80, left: -60,
  },

  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },

  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoMark: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.lg,
  },
  logoMarkIcon: { fontSize: 26, color: Colors.textInverse },
  logo: { fontSize: 30, fontWeight: '800', color: Colors.primaryDark, letterSpacing: -0.6, marginBottom: 4 },
  tagline: { ...Typography.body, color: Colors.textMuted },

  card: {
    backgroundColor: 'transparent',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  title: { ...Typography.h2, color: Colors.text, marginBottom: 4 },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: Spacing.lg },

  fieldGroup: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surfaceLow,
  },
  inputError: { borderColor: Colors.danger },
  fieldError: { ...Typography.caption, color: Colors.danger, marginTop: 4 },

  errorBox: {
    backgroundColor: Colors.danger + '10', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.danger + '35',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginBottom: Spacing.md,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  errorIcon: { fontSize: 14, marginTop: 1 },
  errorBoxText: { ...Typography.body, color: Colors.danger, flex: 1 },

  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...Shadow.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16, fontWeight: '700' },

  forgotWrap: { alignSelf: 'center', marginTop: Spacing.md },
  forgotText: { ...Typography.body, color: Colors.primary, fontWeight: '500' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { ...Typography.body, color: Colors.textSecondary },
  link: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
});
