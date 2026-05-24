import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Terms & Conditions', headerBackTitle: 'Back' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.updated}>Last updated: May 2026</Text>

        <Text style={styles.h2}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By downloading, installing, or using ProAICV ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the App.
        </Text>

        <Text style={styles.h2}>2. Use of the App</Text>
        <Text style={styles.body}>
          ProAICV provides AI-assisted career tools including resume tailoring, cover letter generation, interview preparation, and job listings. You agree to use the App only for lawful purposes and in accordance with these Terms.
        </Text>

        <Text style={styles.h2}>3. User Accounts</Text>
        <Text style={styles.body}>
          You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these Terms.
        </Text>

        <Text style={styles.h2}>4. Job Provider Obligations</Text>
        <Text style={styles.body}>
          Job Providers must post accurate and legitimate job listings. Fraudulent or misleading postings are strictly prohibited. All listings are subject to admin review. We reserve the right to reject or remove any listing.
        </Text>

        <Text style={styles.h2}>5. Subscription and Payments</Text>
        <Text style={styles.body}>
          Pro subscriptions are billed on a recurring basis (monthly, quarterly, or yearly). All payments are processed securely via Razorpay. Subscriptions are non-refundable unless required by applicable law.
        </Text>

        <Text style={styles.h2}>6. Intellectual Property</Text>
        <Text style={styles.body}>
          All content, features, and functionality of the App are the exclusive property of KDA Analytics and are protected by applicable intellectual property laws.
        </Text>

        <Text style={styles.h2}>7. Disclaimer of Warranties</Text>
        <Text style={styles.body}>
          The App is provided "as is" without warranties of any kind. We do not guarantee that AI-generated content is error-free or suitable for any particular purpose. Use AI suggestions as a guide, not as professional advice.
        </Text>

        <Text style={styles.h2}>8. Limitation of Liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law, KDA Analytics shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of the App.
        </Text>

        <Text style={styles.h2}>9. Changes to Terms</Text>
        <Text style={styles.body}>
          We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance of the revised Terms.
        </Text>

        <Text style={styles.h2}>10. Contact</Text>
        <Text style={styles.body}>
          For questions about these Terms, contact us at info@kdaanalytics.com.
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
