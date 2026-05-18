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
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>CVProAI</Text>
            <Text style={styles.tagline}>{tagline}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Welcome back</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="you@example.com"
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
            >
              {isLoading
                ? <ActivityIndicator color={Colors.textInverse} />
                : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register">
                <Text style={styles.link}>Sign Up</Text>
              </Link>
            </View>
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
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { ...Typography.h1, color: Colors.primary, marginBottom: Spacing.xs },
  tagline: { ...Typography.body, color: Colors.textSecondary },
  form: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  title: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.lg },
  fieldGroup: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.text, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputError: { borderColor: Colors.danger },
  fieldError: { ...Typography.caption, color: Colors.danger, marginTop: 4 },
  errorBox: {
    backgroundColor: Colors.danger + '12', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.danger + '40',
    paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.sm,
  },
  errorBoxText: { ...Typography.body, color: Colors.danger, textAlign: 'center' },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { ...Typography.body, color: Colors.textSecondary },
  link: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
});
