import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const DIMENSION_LABELS: Record<string, string> = {
  keyword_match: 'Keyword Match',
  skills_coverage: 'Skills Coverage',
  format_quality: 'Format Quality',
  experience_relevance: 'Experience',
  education_match: 'Education',
};

interface Props {
  breakdown: Record<string, number>;
}

export function ScoreBreakdown({ breakdown }: Props) {
  return (
    <View style={styles.container}>
      {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
        const score = breakdown[key] ?? 0;
        const color =
          score >= 80 ? Colors.matchHigh
          : score >= 60 ? Colors.matchMid
          : Colors.matchLow;
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${score}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.score, { color }]}>{score}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { ...Typography.bodySmall, color: Colors.textSecondary, width: 120 },
  barTrack: {
    flex: 1, height: 7, backgroundColor: Colors.border,
    borderRadius: Radius.full, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.full },
  score: { ...Typography.label, width: 28, textAlign: 'right', fontWeight: '600' },
});
