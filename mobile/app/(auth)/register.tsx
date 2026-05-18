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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { register: registerUser, isLoading, pendingRole } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const isProvider = pendingRole === 'job_provider';
  const tagline = isProvider
    ? 'List smarter. Hire faster.'
    : 'Apply smarter. Get hired faster.';
  const subtitle = isProvider
    ? 'Create your Job Provider account'
    : 'Create your free Job Seeker account';

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      await registerUser(data.email, data.password, data.name);
    } catch (err: any) {
      const status = err?.response?.status;
      if (!status) {
        setErrorMsg('No internet connection. Please check your network and try again.');
      } else if (status === 400 || status === 409) {
        setErrorMsg('An account with this email already exists. Try signing in instead.');
      } else if (status === 422) {
        setErrorMsg('Please check your details — all fields are required and password must be at least 8 characters.');
      } else if (status >= 500) {
        setErrorMsg('Our servers are having trouble. Please try again in a few minutes.');
      } else {
        setErrorMsg('Could not create account. Please try again.');
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
            <Text style={styles.title}>{subtitle}</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{errorMsg}</Text>
              </View>
            ) : null}

            {(['name', 'email', 'password', 'confirmPassword'] as const).map((field) => (
              <Controller
                key={field}
                control={control}
                name={field}
                render={({ field: { onChange, value, onBlur } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      {field === 'confirmPassword' ? 'Confirm Password' : field.charAt(0).toUpperCase() + field.slice(1)}
                    </Text>
                    <TextInput
                      style={[styles.input, errors[field] && styles.inputError]}
                      placeholder={field === 'email' ? 'you@example.com' : ''}
                      keyboardType={field === 'email' ? 'email-address' : 'default'}
                      autoCapitalize={field === 'name' ? 'words' : 'none'}
                      secureTextEntry={field === 'password' || field === 'confirmPassword'}
                      onChangeText={(t) => { onChange(t); setErrorMsg(''); }}
                      onBlur={onBlur}
                      value={value}
                    />
                    {errors[field] && <Text style={styles.fieldError}>{errors[field]?.message}</Text>}
                  </View>
                )}
              />
            ))}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color={Colors.textInverse} />
                : <Text style={styles.buttonText}>Create Account</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login">
                <Text style={styles.link}>Sign In</Text>
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
  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { ...Typography.h1, color: Colors.primary },
  tagline: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  form: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  title: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },
  errorBox: {
    backgroundColor: Colors.danger + '12', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.danger + '40',
    paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.sm,
  },
  errorBoxText: { ...Typography.body, color: Colors.danger, textAlign: 'center' },
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
