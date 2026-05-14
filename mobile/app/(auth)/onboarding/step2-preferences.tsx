import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

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
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title}>Your job preferences</Text>
        <Text style={styles.subtitle}>Help us find the right opportunities</Text>

        <Text style={styles.sectionLabel}>Experience Level</Text>
        <View style={styles.chipRow}>
          {EXPERIENCE_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.chip, experienceLevel === level && styles.chipSelected]}
              onPress={() => setExperienceLevel(level)}
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
            >
              <Text style={[styles.chipText, remotePreference === pref && styles.chipTextSelected]}>
                {pref}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Job Type</Text>
        <View style={styles.chipRow}>
          {JOB_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, selectedJobTypes.includes(type) && styles.chipSelected]}
              onPress={() => toggleJobType(type)}
            >
              <Text style={[styles.chipText, selectedJobTypes.includes(type) && styles.chipTextSelected]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={onNext}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: Spacing.lg },
  progress: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  dotDone: { backgroundColor: Colors.secondary, width: 24 },
  step: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.xs },
  title: { ...Typography.h2, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  sectionLabel: { ...Typography.h4, color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipText: { ...Typography.label, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary },
  button: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xl,
  },
  buttonText: { ...Typography.label, color: Colors.textInverse, fontSize: 16 },
});
