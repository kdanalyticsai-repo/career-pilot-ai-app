import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Privacy Policy', headerBackTitle: 'Back' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.updated}>Last updated: May 2026</Text>

        <Text style={styles.h2}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly, including your name, email address, phone number, resume content, job preferences, and company details (for Job Providers). We also collect usage data such as features accessed, sessions, and device information.
        </Text>

        <Text style={styles.h2}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          We use your information to provide and improve the App, personalize AI-generated content, process payments, communicate with you about your account, and review job listings for quality and compliance.
        </Text>

        <Text style={styles.h2}>3. AI Processing</Text>
        <Text style={styles.body}>
          Resume and job data you submit may be processed by AI models (including Anthropic Claude) to generate tailored content. Your data is processed securely and is not used to train third-party AI models without your consent.
        </Text>

        <Text style={styles.h2}>4. Data Storage</Text>
        <Text style={styles.body}>
          Your data is stored securely on cloud servers. Resumes are stored in encrypted object storage (Cloudflare R2). We retain your data as long as your account is active, or as required by law.
        </Text>

        <Text style={styles.h2}>5. Data Sharing</Text>
        <Text style={styles.body}>
          We do not sell your personal information. We share data only with: (a) service providers who assist in operating the App (e.g., Razorpay for payments, cloud storage), (b) Job Providers, when you apply for a job, and (c) when required by law.
        </Text>

        <Text style={styles.h2}>6. Your Rights</Text>
        <Text style={styles.body}>
          You may request access to, correction of, or deletion of your personal data at any time by contacting us at info@kdaanalytics.com. We will respond within 30 days.
        </Text>

        <Text style={styles.h2}>7. Cookies and Analytics</Text>
        <Text style={styles.body}>
          The App may use analytics tools to understand usage patterns. This data is aggregated and anonymized. We do not use advertising trackers.
        </Text>

        <Text style={styles.h2}>8. Security</Text>
        <Text style={styles.body}>
          We implement industry-standard security measures including encrypted data transmission (HTTPS/TLS) and secure storage. However, no method of transmission over the internet is 100% secure.
        </Text>

        <Text style={styles.h2}>9. Children's Privacy</Text>
        <Text style={styles.body}>
          The App is intended for users 18 years and older. We do not knowingly collect personal information from minors.
        </Text>

        <Text style={styles.h2}>10. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy periodically. We will notify you of significant changes via the App or email. Continued use of the App constitutes acceptance.
        </Text>

        <Text style={styles.h2}>11. Contact</Text>
        <Text style={styles.body}>
          For privacy-related questions or data requests, contact us at info@kdaanalytics.com.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm },
  updated: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },
  h2: { ...Typography.label, color: Colors.text, fontWeight: '700', marginTop: Spacing.md },
  body: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
});
