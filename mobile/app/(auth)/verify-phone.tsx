import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Typography, Spacing, Radius, Shadow, HeroColors } from '@/constants/theme';

type Phase = 'phone' | 'otp';

export default function VerifyPhoneScreen() {
  const { user, setUser } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('phone');
  const [phone, setPhone] = useState(user?.phone?.replace(/^\+91/, '') ?? '');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    const cleaned = phone.trim().replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await api.post('/auth/send-phone-otp', { phone: `+91${cleaned}` });
      setPhase('otp');
      startCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err: any) {
      const status = err?.response?.status;
      if (!status) setErrorMsg('No internet connection. Please try again.');
      else setErrorMsg('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) {
      // Handle paste: distribute digits across boxes
      const digits = val.replace(/\D/g, '').split('').slice(0, 6);
      const next = [...otp];
      digits.forEach((d, i) => { if (idx + i < 6) next[idx + i] = d; });
      setOtp(next);
      const focusIdx = Math.min(idx + digits.length, 5);
      otpRefs.current[focusIdx]?.focus();
      return;
    }
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setErrorMsg('Enter all 6 digits.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/verify-phone-otp', { otp: code });
      setUser(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) setErrorMsg('Invalid or expired code. Please try again.');
      else setErrorMsg('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resend = () => {
    setOtp(['', '', '', '', '', '']);
    setErrorMsg('');
    setPhase('phone');
  };

  return (
    <View style={styles.root}>
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkIcon}>✦</Text>
              </View>
              <Text style={styles.logo}>ProAICV</Text>
              <Text style={styles.tagline}>Verify your mobile number</Text>
            </View>

            <View style={styles.card}>
              {phase === 'phone' ? (
                <>
                  <Text style={styles.title}>Enter your mobile number</Text>
                  <Text style={styles.subtitle}>We'll send a 6-digit code to verify your number</Text>

                  {errorMsg ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorIcon}>⚠️</Text>
                      <Text style={styles.errorBoxText}>{errorMsg}</Text>
                    </View>
                  ) : null}

                  <View style={styles.phoneRow}>
                    <View style={styles.prefix}>
                      <Text style={styles.prefixText}>🇮🇳 +91</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="10-digit mobile number"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setErrorMsg(''); }}
                      autoFocus
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, Shadow.md, (isLoading || phone.length < 10) && styles.buttonDisabled]}
                    onPress={sendOtp}
                    disabled={isLoading || phone.length < 10}
                    activeOpacity={0.85}
                  >
                    {isLoading
                      ? <ActivityIndicator color={Colors.textInverse} />
                      : <Text style={styles.buttonText}>Send Code</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.title}>Enter verification code</Text>
                  <Text style={styles.subtitle}>Sent to +91 {phone} and your email</Text>

                  {errorMsg ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorIcon}>⚠️</Text>
                      <Text style={styles.errorBoxText}>{errorMsg}</Text>
                    </View>
                  ) : null}

                  <View style={styles.otpRow}>
                    {otp.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={(r) => { otpRefs.current[idx] = r; }}
                        style={[styles.otpBox, digit && styles.otpBoxFilled]}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(v, idx)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, idx)}
                        keyboardType="numeric"
                        maxLength={6}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, Shadow.md, (isLoading || otp.join('').length < 6) && styles.buttonDisabled]}
                    onPress={verifyOtp}
                    disabled={isLoading || otp.join('').length < 6}
                    activeOpacity={0.85}
                  >
                    {isLoading
                      ? <ActivityIndicator color={Colors.textInverse} />
                      : <Text style={styles.buttonText}>Verify Number</Text>}
                  </TouchableOpacity>

                  <View style={styles.resendRow}>
                    {countdown > 0 ? (
                      <Text style={styles.resendCountdown}>Resend code in {countdown}s</Text>
                    ) : (
                      <TouchableOpacity onPress={resend}>
                        <Text style={styles.resendLink}>Change number or resend code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
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
    backgroundColor: Colors.primary, opacity: 0.07, top: -100, right: -60,
  },
  orb2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.tertiaryBright, opacity: 0.05, bottom: 80, left: -50,
  },

  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },

  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoMark: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm, ...Shadow.lg,
  },
  logoMarkIcon: { fontSize: 26, color: Colors.textInverse },
  logo: { fontSize: 30, fontWeight: '800', color: Colors.primaryDark, letterSpacing: -0.6, marginBottom: 4 },
  tagline: { ...Typography.body, color: Colors.textMuted },

  card: { backgroundColor: 'transparent', borderRadius: Radius.xl, padding: Spacing.lg },
  title: { ...Typography.h2, color: Colors.text, marginBottom: 4 },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: Spacing.lg },

  errorBox: {
    backgroundColor: Colors.danger + '10', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.danger + '35',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  errorIcon: { fontSize: 14, marginTop: 1 },
  errorBoxText: { ...Typography.body, color: Colors.danger, flex: 1 },

  phoneRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  prefix: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    backgroundColor: Colors.surfaceLow, justifyContent: 'center',
  },
  prefixText: { ...Typography.body, color: Colors.text, fontWeight: '600' },
  phoneInput: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.surfaceLow,
  },

  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  otpBox: {
    width: 46, height: 56, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, textAlign: 'center', fontSize: 22, fontWeight: '700',
    color: Colors.text, backgroundColor: Colors.surfaceLow,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '20' },

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16, fontWeight: '700' },

  resendRow: { alignItems: 'center', marginTop: Spacing.lg },
  resendCountdown: { ...Typography.body, color: Colors.textMuted },
  resendLink: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
});
