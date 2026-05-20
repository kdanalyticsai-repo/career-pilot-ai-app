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
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

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

const FIELD_CONFIG: { name: keyof FormData; label: string; placeholder: string; keyboard?: any; capitalize?: any; secure?: boolean }[] = [
  { name: 'name', label: 'Full Name', placeholder: 'Your name', capitalize: 'words' },
  { name: 'email', label: 'Email address', placeholder: 'you@example.com', keyboard: 'email-address', capitalize: 'none' },
  { name: 'password', label: 'Password', placeholder: 'Min. 8 characters', secure: true, capitalize: 'none' },
  { name: 'confirmPassword', label: 'Confirm Password', placeholder: 'Re-enter password', secure: true, capitalize: 'none' },
];

export default function RegisterScreen() {
  const { register: registerUser, isLoading, pendingRole } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState('');
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const isProvider = pendingRole === 'job_provider';
  const tagline = isProvider ? 'List smarter. Hire faster.' : 'Apply smarter. Get hired faster.';
  const subtitle = isProvider ? 'Create your Job Provider account' : 'Create your free Job Seeker account';

  const onSubmit = async (data: FormData) => {
    setErrorMsg('');
    try {
      await registerUser(data.email, data.password, data.name);
    } catch (err: any) {
      const status = err?.response?.status;
      if (!status) {
        setErrorMsg('No internet connection. Please check your network and try again.');
      } else if (status === 400 || status === 409) {
        setErrorMsg('This email is already registered. Try signing in instead.');
      } else if (status === 403) {
        setErrorMsg('This email address is not available for registration. Please use a different email.');
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
    <View style={styles.root}>
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={styles.header}>
              <View style={[styles.logoMark, isProvider && { backgroundColor: Colors.tertiaryContainer }]}>
                <Text style={styles.logoMarkIcon}>{isProvider ? '🏢' : '✦'}</Text>
              </View>
              <Text style={styles.logo}>CVProAI</Text>
              <Text style={styles.tagline}>{tagline}</Text>
            </View>

            <View style={[styles.card, Shadow.md]}>
              <Text style={styles.title}>{subtitle}</Text>

              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorBoxText}>{errorMsg}</Text>
                </View>
              ) : null}

              {FIELD_CONFIG.map((fc) => (
                <Controller
                  key={fc.name}
                  control={control}
                  name={fc.name}
                  render={({ field: { onChange, value, onBlur } }) => (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>{fc.label}</Text>
                      <TextInput
                        style={[styles.input, errors[fc.name] && styles.inputError]}
                        placeholder={fc.placeholder}
                        placeholderTextColor={Colors.textMuted}
                        keyboardType={fc.keyboard ?? 'default'}
                        autoCapitalize={fc.capitalize ?? 'none'}
                        secureTextEntry={fc.secure}
                        onChangeText={(t) => { onChange(t); setErrorMsg(''); }}
                        onBlur={onBlur}
                        value={value}
                      />
                      {errors[fc.name] && <Text style={styles.fieldError}>{errors[fc.name]?.message}</Text>}
                    </View>
                  )}
                />
              ))}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled, isProvider && { backgroundColor: Colors.tertiaryContainer }]}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={styles.buttonText}>Create Account</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login">
                <Text style={styles.link}>Sign In</Text>
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
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: Colors.secondary, opacity: 0.07, top: -100, left: -60,
  },
  orb2: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.tertiaryBright, opacity: 0.05, bottom: 60, right: -50,
  },

  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },

  header: { alignItems: 'center', marginBottom: Spacing.lg },
  logoMark: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.lg,
  },
  logoMarkIcon: { fontSize: 26, color: Colors.textInverse },
  logo: { fontSize: 30, fontWeight: '800', color: Colors.primaryDark, letterSpacing: -0.6 },
  tagline: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },

  card: {
    backgroundColor: 'transparent',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  title: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.md },

  errorBox: {
    backgroundColor: Colors.danger + '10', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.danger + '35',
    paddingHorizontal: Spacing.md, paddingVertical: 10, marginBottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  errorIcon: { fontSize: 14, marginTop: 1 },
  errorBoxText: { ...Typography.body, color: Colors.danger, flex: 1 },

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

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { ...Typography.body, color: Colors.textSecondary },
  link: { ...Typography.body, color: Colors.primary, fontWeight: '700' },
});
