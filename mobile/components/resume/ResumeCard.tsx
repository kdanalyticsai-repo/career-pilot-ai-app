import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

interface Resume {
  id: string;
  name: string;
  status: string;
  ats_score: number | null;
  is_primary: boolean;
  updated_at: string;
}

interface Props {
  resume: Resume;
  onPress: () => void;
  onDelete?: () => void;
  onRename?: () => void;
}

export function ResumeCard({ resume, onPress, onDelete, onRename }: Props) {
  const scoreColor =
    (resume.ats_score ?? 0) >= 80 ? Colors.matchHigh
    : (resume.ats_score ?? 0) >= 60 ? Colors.matchMid
    : Colors.matchLow;

  const openMenu = () => {
    const options: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [];
    if (onRename) options.push({ text: 'Rename', onPress: onRename });
    if (onDelete) options.push({ text: 'Delete', style: 'destructive', onPress: onDelete });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(resume.name, undefined, options);
  };

  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.topRow}>
        <View style={styles.nameSection}>
          <Text style={styles.name} numberOfLines={1}>{resume.name}</Text>
          {resume.is_primary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryText}>Primary</Text>
            </View>
          )}
        </View>

        <View style={styles.rightSection}>
          {resume.status === 'ready' && resume.ats_score !== null ? (
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreNum, { color: scoreColor }]}>{resume.ats_score}</Text>
              <Text style={styles.scoreLabel}>ATS</Text>
            </View>
          ) : resume.status === 'processing' ? (
            <View style={styles.processingBadge}>
              <Text style={styles.processingText}>Analyzing...</Text>
            </View>
          ) : (
            <View style={styles.failedBadge}>
              <Text style={styles.failedText}>Failed</Text>
            </View>
          )}
          <TouchableOpacity style={styles.menuBtn} onPress={openMenu} hitSlop={8}>
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {resume.status === 'ready' && resume.ats_score !== null && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            width: `${resume.ats_score}%`,
            backgroundColor: scoreColor,
          }]} />
        </View>
      )}

      <Text style={styles.date}>
        Updated {new Date(resume.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  nameSection: { flex: 1, marginRight: Spacing.sm },
  name: { ...Typography.h4, color: Colors.text, marginBottom: 4 },
  primaryBadge: {
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  primaryText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scoreCircle: { alignItems: 'center', minWidth: 48 },
  scoreNum: { fontSize: 22, fontWeight: '700' },
  scoreLabel: { ...Typography.caption, color: Colors.textMuted },
  processingBadge: { backgroundColor: Colors.warning + '20', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  processingText: { ...Typography.caption, color: Colors.warning, fontWeight: '600' },
  failedBadge: { backgroundColor: Colors.danger + '20', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  failedText: { ...Typography.caption, color: Colors.danger, fontWeight: '600' },
  menuBtn: { padding: 4 },
  menuIcon: { fontSize: 20, color: Colors.textMuted, lineHeight: 22 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', borderRadius: Radius.full },
  date: { ...Typography.caption, color: Colors.textMuted },
});
