import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius } from '@/constants/theme';

interface Props {
  label: string;
  color?: string;
}

export function Badge({ label, color = Colors.primary }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { ...Typography.caption, fontWeight: '600' },
});
