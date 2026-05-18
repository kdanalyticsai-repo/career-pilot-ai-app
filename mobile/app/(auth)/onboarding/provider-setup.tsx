import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

export default function ProviderSetupScreen() {
  const { setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name.'); return; }
    if (!company.trim()) { Alert.alert('Required', 'Please enter your company name.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/users/me/onboarding', {
        name: name.trim(),
        preferences: {},
        company_name: company.trim(),
      });
      setUser(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (!status) {
        Alert.alert('No Connection', 'Please check your internet connection and try again.');
      } else if (status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please sign in again.');
      } else if (status >= 500) {
        Alert.alert('Server Error', 'Our servers are having trouble. Please try again in a few minutes.');
      } else {
        Alert.alert('Setup Failed', 'Could not complete your profile setup. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.logo}>CVProAI</Text>
            <Text style={styles.subtitle}>Set up your provider account</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Tell us about you</Text>
            <Text style={styles.body}>This helps candidates know who is posting jobs on CVProAI.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Company / Organisation *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acme Corp"
                value={company}
                onChangeText={setCompany}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleComplete}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? 'Setting up...' : 'Continue'}</Text>
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
  container: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { ...Typography.h1, color: Colors.primary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  form: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  title: { ...Typography.h3, color: Colors.text },
  body: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20 },
  field: { gap: 6 },
  label: { ...Typography.label, color: Colors.text },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.background,
  },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.6 },
  btnText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },
});
