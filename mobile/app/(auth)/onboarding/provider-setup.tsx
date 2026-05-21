import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

const INDUSTRIES = ['IT / Software', 'Finance', 'Healthcare', 'Marketing', 'Education', 'Manufacturing', 'Media', 'Other'];
const COMPANY_SIZES = ['1–10', '11–50', '51–200', '200+'];
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export default function ProviderSetupScreen() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [name, setName] = useState(user?.name ?? '');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [vacancies, setVacancies] = useState('');
  const [companySize, setCompanySize] = useState('');

  // Step 2 fields
  const [pan, setPan] = useState('');
  const [cin, setCin] = useState('');
  const [gstin, setGstin] = useState('');
  const [panError, setPanError] = useState('');

  const validateStep1 = () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your full name.'); return false; }
    if (!company.trim()) { Alert.alert('Required', 'Please enter your company name.'); return false; }
    if (!vacancies.trim() || isNaN(Number(vacancies)) || Number(vacancies) < 1) {
      Alert.alert('Required', 'Please enter a valid number of open vacancies.'); return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleComplete = async () => {
    const panClean = pan.trim().toUpperCase();
    if (panClean && !PAN_REGEX.test(panClean)) {
      setPanError('Invalid PAN format. Must be like AAAAA9999A.');
      return;
    }
    setPanError('');
    setLoading(true);
    try {
      const { data } = await api.post('/users/me/onboarding', {
        name: name.trim(),
        preferences: {
          industries: industry ? [industry] : [],
          company_size: companySize,
        },
        company_name: company.trim(),
        company_pan: panClean || null,
        company_reg_no: cin.trim() || null,
        gstin: gstin.trim().toUpperCase() || null,
        total_vacancies: Number(vacancies),
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
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkIcon}>✦</Text>
            </View>
            <Text style={styles.logo}>ProAICV</Text>
            <Text style={styles.subtitle}>Provider Setup</Text>
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>
          <Text style={styles.stepLabel}>Step {step} of 2 — {step === 1 ? 'Company Basics' : 'Verification'}</Text>

          {step === 1 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Tell us about your company</Text>

              <Text style={styles.label}>Your Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Company / Organisation *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acme Corp"
                placeholderTextColor={Colors.textMuted}
                value={company}
                onChangeText={setCompany}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Industry (what you hire for)</Text>
              <View style={styles.chipRow}>
                {INDUSTRIES.map((ind) => (
                  <TouchableOpacity
                    key={ind}
                    style={[styles.chip, industry === ind && styles.chipSelected]}
                    onPress={() => setIndustry(ind)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, industry === ind && styles.chipTextSelected]}>{ind}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>No. of Open Vacancies *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                placeholderTextColor={Colors.textMuted}
                value={vacancies}
                onChangeText={(t) => setVacancies(t.replace(/\D/g, ''))}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Company Size</Text>
              <View style={styles.chipRow}>
                {COMPANY_SIZES.map((sz) => (
                  <TouchableOpacity
                    key={sz}
                    style={[styles.chip, companySize === sz && styles.chipSelected]}
                    onPress={() => setCompanySize(sz)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, companySize === sz && styles.chipTextSelected]}>{sz}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.btn, Shadow.md]} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.btnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Verification details</Text>
              <Text style={styles.sectionBody}>Help us verify your company. This protects job seekers from spam listings.</Text>

              <Text style={styles.label}>Company PAN *</Text>
              <TextInput
                style={[styles.input, panError ? styles.inputError : null]}
                placeholder="e.g. AAAAA9999A"
                placeholderTextColor={Colors.textMuted}
                value={pan}
                onChangeText={(t) => { setPan(t.toUpperCase()); setPanError(''); }}
                autoCapitalize="characters"
                maxLength={10}
              />
              {panError ? <Text style={styles.errorText}>{panError}</Text> : null}

              <Text style={styles.label}>Company Registration No. (CIN) <Text style={styles.optional}>optional</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. U72200MH2015PTC123456"
                placeholderTextColor={Colors.textMuted}
                value={cin}
                onChangeText={setCin}
                autoCapitalize="characters"
                maxLength={21}
              />

              <Text style={styles.label}>GSTIN <Text style={styles.optional}>optional</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 22AAAAA9999A1Z5"
                placeholderTextColor={Colors.textMuted}
                value={gstin}
                onChangeText={(t) => setGstin(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={15}
              />

              <View style={styles.infoNotice}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>
                  These details are reviewed by our team. A verified badge will appear on your profile once approved, helping candidates trust your listings.
                </Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnFlex, Shadow.md, loading && styles.btnDisabled]}
                  onPress={handleComplete}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.textInverse} />
                    : <Text style={styles.btnText}>Complete Setup</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },

  header: { alignItems: 'center', marginBottom: Spacing.lg },
  logoMark: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm, ...Shadow.md,
  },
  logoMarkIcon: { fontSize: 22, color: Colors.textInverse },
  logo: { fontSize: 26, fontWeight: '800', color: Colors.primaryDark, letterSpacing: -0.5, marginBottom: 2 },
  subtitle: { ...Typography.body, color: Colors.textMuted },

  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine: { flex: 0, width: 60, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: Colors.primary },
  stepLabel: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.lg },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle },
  sectionTitle: { ...Typography.h3, color: Colors.text },
  sectionBody: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20, marginTop: -Spacing.xs },

  label: { ...Typography.label, color: Colors.text },
  optional: { ...Typography.caption, color: Colors.textMuted, fontWeight: '400' },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.surfaceLow,
  },
  inputError: { borderColor: Colors.danger },
  errorText: { ...Typography.caption, color: Colors.danger, marginTop: -Spacing.xs + 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 9, backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { ...Typography.label, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.primaryDark, fontWeight: '700' },

  infoNotice: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.primary + '10', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary + '25',
    padding: Spacing.md,
  },
  infoIcon: { fontSize: 14, marginTop: 2 },
  infoText: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1, lineHeight: 18 },

  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  backBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { ...Typography.label, color: Colors.textSecondary },
  btn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.xs,
  },
  btnFlex: { flex: 1, marginTop: 0 },
  btnDisabled: { opacity: 0.55 },
  btnText: { ...Typography.label, color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
});
