import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

interface Prefs {
  push_job_alerts: boolean;
  push_reminders: boolean;
  email_weekly_digest: boolean;
  email_status_changes: boolean;
  email_tips: boolean;
}

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/notifications/preferences')
      .then(r => setPrefs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof Prefs) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await apiClient.patch('/notifications/preferences', { [key]: updated[key] });
    } catch {
      setPrefs(prefs);
      Alert.alert('Error', 'Failed to update preference.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionSub}>Sent to your device via the CVPilot app</Text>

          <PrefRow
            label="Job alerts"
            description="Get notified when new jobs match your profile"
            value={prefs?.push_job_alerts ?? true}
            onToggle={() => toggle('push_job_alerts')}
          />
          <PrefRow
            label="Reminders"
            description="Nudges for upcoming interviews and next actions"
            value={prefs?.push_reminders ?? true}
            onToggle={() => toggle('push_reminders')}
          />
        </View>

        <View style={[styles.card, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          <Text style={styles.sectionSub}>Sent to your registered email address</Text>

          <PrefRow
            label="Weekly digest"
            description="Top job matches and application summary every week"
            value={prefs?.email_weekly_digest ?? true}
            onToggle={() => toggle('email_weekly_digest')}
          />
          <PrefRow
            label="Status changes"
            description="Email when your application moves to a new stage"
            value={prefs?.email_status_changes ?? false}
            onToggle={() => toggle('email_status_changes')}
          />
          <PrefRow
            label="Career tips"
            description="Resume advice, interview tips, and career insights"
            value={prefs?.email_tips ?? true}
            onToggle={() => toggle('email_tips')}
            last
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrefRow({
  label, description, value, onToggle, last,
}: {
  label: string; description: string; value: boolean; onToggle: () => void; last?: boolean;
}) {
  return (
    <View style={[styles.prefRow, !last && styles.prefRowBorder]}>
      <View style={styles.prefText}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.h4, color: Colors.text, marginBottom: 2 },
  sectionSub: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.md },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  prefRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  prefText: { flex: 1 },
  prefLabel: { ...Typography.label, color: Colors.text, marginBottom: 2 },
  prefDesc: { ...Typography.bodySmall, color: Colors.textSecondary },
});
