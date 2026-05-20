import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Executive'];
const REMOTE_PREFS = ['Remote', 'Hybrid', 'On-site', 'Any'];
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

export default function OnboardingStep2() {
  const params = useLocalSearchParams();
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [remotePreference, setRemotePreference] = useState('Any');
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(['Full-time']);

  const toggleJobType = (type: string) => {
    setSelectedJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const onNext = () => {
    router.push({
      pathname: '/(auth)/onboarding/step3-resume',
      params: {
        ...params,
        experienceLevel: experienceLevel.toLowerCase(),
        remotePreference: remotePreference.toLowerCase().replace('-', ''),
        jobTypes: selectedJobTypes.join(','),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.progress}>
          <View style={[styles.progressStep, styles.progressDone]} />
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={styles.progressStep} />
        </View>

        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Your job preferences</Text>
        <Text style={styles.subtitle}>Help us find the right opportunities for you</Text>

        <Text style={styles.sectionLabel}>Experience Level</Text>
        <View style={styles.chipRow}>
          {EXPERIENCE_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.chip, experienceLevel === level && styles.chipSelected]}
              onPress={() => setExperienceLevel(level)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, experienceLevel === level && styles.chipTextSelected]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Work Style</Text>
        <View style={styles.chipRow}>
          {REMOTE_PREFS.map((pref) => (
            <TouchableOpacity
              key={pref}
              style={[styles.chip, remotePreference === pref && styles.chipSelected]}
              onPress={() => setRemotePreference(pref)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, remotePreference === pref && styles.chipTextSelected]}>
                {pref}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Job Type <Text style={styles.multiHint}>(select all that apply)</Text></Text>
        <View style={styles.chipRow}>
          {JOB_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, selectedJobTypes.includes(type) && styles.chipSelected]}
              onPress={() => toggleJobType(type)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, selectedJobTypes.includes(type) && styles.chipTextSelected]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.button, Shadow.md]} onPress={onNext} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg },

  progress: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  progressStep: { height: 4, flex: 1, borderRadius: 2, backgroundColor: Colors.backgroundDim },
  progressActive: { backgroundColor: Colors.primary },
  progressDone: { backgroundColor: Colors.secondary },

  step: { ...Typography.caption, color: Colors.primary, fontWeight: '700', marginBottom: Spacing.xs, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs, letterSpacing: -0.3 },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 22 },

  sectionLabel: { ...Typography.h4, color: Colors.text, fontWeight: '700', marginBottom: Spacing.sm, marginTop: Spacing.md },
  multiHint: { ...Typography.caption, color: Colors.textMuted, fontWeight: '400' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 9,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { ...Typography.label, color: Colors.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: Colors.primaryDark, fontWeight: '700' },

  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.xl,
  },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
});
