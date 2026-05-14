import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

interface Props {
  quickWins: string[];
  criticalIssues?: string[];
}

export function QuickWins({ quickWins, criticalIssues }: Props) {
  return (
    <View style={styles.container}>
      {criticalIssues && criticalIssues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Critical Issues</Text>
          {criticalIssues.map((issue, i) => (
            <View key={i} style={styles.issueRow}>
              <View style={styles.issueDot} />
              <Text style={styles.issueText}>{issue}</Text>
            </View>
          ))}
        </View>
      )}

      {quickWins.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Wins</Text>
          {quickWins.map((win, i) => (
            <View key={i} style={styles.winRow}>
              <View style={styles.winBadge}>
                <Text style={styles.winBadgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.winText}>{win}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.label, color: Colors.text, fontWeight: '700', marginBottom: 2 },

  issueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  issueDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.danger, marginTop: 5,
  },
  issueText: { ...Typography.body, color: Colors.text, flex: 1 },

  winRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  winBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  winBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.secondary },
  winText: { ...Typography.body, color: Colors.text, flex: 1 },
});
