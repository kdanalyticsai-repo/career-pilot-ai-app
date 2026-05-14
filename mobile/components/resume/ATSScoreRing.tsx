import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '@/constants/theme';

const RADIUS = 54;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2 + 4;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  score: number | null;
  label?: string;
  size?: 'lg' | 'sm';
}

export function ATSScoreRing({ score, label = 'ATS Score', size = 'lg' }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const safeScore = score ?? 0;

  const scoreColor =
    safeScore >= 80 ? Colors.matchHigh
    : safeScore >= 60 ? Colors.matchMid
    : Colors.matchLow;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: safeScore,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [safeScore]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const isSmall = size === 'sm';
  const containerSize = isSmall ? SIZE * 0.65 : SIZE;
  const radius = isSmall ? RADIUS * 0.65 : RADIUS;
  const stroke = isSmall ? STROKE * 0.7 : STROKE;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <Svg width={containerSize} height={containerSize} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={Colors.border}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={scoreColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={[styles.center, { width: containerSize, height: containerSize }]}>
        {score === null ? (
          <Text style={styles.dash}>—</Text>
        ) : (
          <>
            <Text style={[styles.scoreNum, { color: scoreColor, fontSize: isSmall ? 22 : 40 }]}>
              {safeScore}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </>
        )}
      </View>
      {!isSmall && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  center: {
    position: 'absolute',
    top: 0, left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNum: { fontWeight: '700', lineHeight: 44 },
  scoreMax: { ...Typography.caption, color: Colors.textMuted, marginTop: -4 },
  dash: { fontSize: 28, color: Colors.textMuted, fontWeight: '600' },
  label: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 6, fontWeight: '500' },
});
