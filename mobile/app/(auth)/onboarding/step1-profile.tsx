import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function OnboardingStep1() {
  const { user } = useAuthStore();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });

  const onNext = (data: FormData) => {
    router.push({ pathname: '/(auth)/onboarding/step2-preferences', params: data });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Back */}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Progress */}
        <View style={styles.progress}>
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={styles.progressStep} />
          <View style={styles.progressStep} />
        </View>

        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>We'll personalize your job matches based on your profile</Text>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value, onBlur } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Your full name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
              {errors.name && (
                <View style={styles.errorRow}>
                  <Text style={styles.errorText}>⚠ {errors.name.message}</Text>
                </View>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value, onBlur } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
              />
            </View>
          )}
        />

        <TouchableOpacity style={[styles.button, Shadow.md]} onPress={handleSubmit(onNext)} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.lg },

  progress: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressStep: {
    height: 4, flex: 1, borderRadius: 2, backgroundColor: Colors.backgroundDim,
  },
  progressActive: { backgroundColor: Colors.primary },

  step: { ...Typography.caption, color: Colors.primary, fontWeight: '700', marginBottom: Spacing.xs, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs, letterSpacing: -0.3 },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 22 },
  optional: { color: Colors.textMuted, fontWeight: '400' },

  fieldGroup: { marginBottom: Spacing.md },
  label: { ...Typography.label, color: Colors.text, fontWeight: '600', marginBottom: Spacing.xs },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.surface,
  },
  inputError: { borderColor: Colors.danger },
  errorRow: { marginTop: 5 },
  errorText: { ...Typography.caption, color: Colors.danger, fontWeight: '600' },

  backRow: { marginBottom: Spacing.sm },
  backText: { ...Typography.body, color: Colors.textSecondary, fontWeight: '600' },

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 15, alignItems: 'center', marginTop: 'auto',
  },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
});
