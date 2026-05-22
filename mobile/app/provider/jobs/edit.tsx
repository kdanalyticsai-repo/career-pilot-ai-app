import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, HeroColors } from '@/constants/theme';

type PickOption = { label: string; value: string };

const JOB_TYPES: PickOption[] = [
  { label: 'Full-time', value: 'full_time' },
  { label: 'Part-time', value: 'part_time' },
  { label: 'Contract', value: 'contract' },
];
const EXP_LEVELS: PickOption[] = [
  { label: 'Entry', value: 'entry' },
  { label: 'Mid', value: 'mid' },
  { label: 'Senior', value: 'senior' },
  { label: 'Lead', value: 'lead' },
];
const REMOTE_TYPES: PickOption[] = [
  { label: 'On-site', value: 'onsite' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
];

function PickerRow({ label, options, value, onChange }: {
  label: string; options: PickOption[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, value === o.value && styles.chipActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.chipText, value === o.value && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      {children}
    </View>
  );
}

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('full_time');
  const [expLevel, setExpLevel] = useState('mid');
  const [remoteType, setRemoteType] = useState('onsite');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [vacancies, setVacancies] = useState('1');
  const [skills, setSkills] = useState('');
  const [requirements, setRequirements] = useState('');
  const [description, setDescription] = useState('');
  const [populated, setPopulated] = useState(false);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['provider-jobs'],
    queryFn: () => api.get('/provider/jobs').then(r => r.data as any[]),
  });

  const job = jobs?.find((j: any) => j.id === id);

  useEffect(() => {
    if (job && !populated) {
      setTitle(job.title ?? '');
      setCompany(job.company ?? '');
      setLocation(job.location ?? '');
      setJobType(job.job_type ?? 'full_time');
      setExpLevel(job.experience_level ?? 'mid');
      setRemoteType(job.remote_type ?? 'onsite');
      setSalaryMin(job.salary_min != null ? String(job.salary_min) : '');
      setSalaryMax(job.salary_max != null ? String(job.salary_max) : '');
      setVacancies(job.vacancies != null ? String(job.vacancies) : '1');
      setSkills((job.skills_required ?? []).join(', '));
      setRequirements((job.requirements ?? []).join('\n'));
      setDescription(job.description ?? '');
      setPopulated(true);
    }
  }, [job, populated]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.put(`/provider/jobs/${id}`, {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      job_type: jobType,
      experience_level: expLevel,
      remote_type: remoteType,
      salary_min: salaryMin ? parseInt(salaryMin, 10) : null,
      salary_max: salaryMax ? parseInt(salaryMax, 10) : null,
      vacancies: vacancies ? parseInt(vacancies, 10) : 1,
      skills_required: skills.split(',').map(s => s.trim()).filter(Boolean),
      requirements: requirements.split('\n').map(s => s.trim()).filter(Boolean),
      description: description.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-jobs'] });
      qc.invalidateQueries({ queryKey: ['provider-job', id] });
      Alert.alert('Saved', 'Your listing has been updated and re-submitted for review.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail ?? 'Could not save changes. Please try again.';
      Alert.alert('Error', detail);
    },
  });

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Required', 'Job title is required.'); return; }
    if (!company.trim()) { Alert.alert('Required', 'Company name is required.'); return; }
    if (!location.trim()) { Alert.alert('Required', 'Location is required.'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Job description is required.'); return; }
    save();
  };

  if (isLoading && !populated) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: 'Edit Listing' }} />
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Edit Listing' }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>Editing will reset your listing to Pending Review until re-approved.</Text>
          </View>

          <Field label="Job Title" required>
            <TextInput style={styles.input} placeholder="e.g. Senior React Native Developer" value={title} onChangeText={setTitle} />
          </Field>

          <Field label="Company Name" required>
            <TextInput style={styles.input} placeholder="e.g. Acme Corp" value={company} onChangeText={setCompany} autoCapitalize="words" />
          </Field>

          <Field label="Location" required>
            <TextInput style={styles.input} placeholder="e.g. Bangalore, Karnataka" value={location} onChangeText={setLocation} autoCapitalize="words" />
          </Field>

          <PickerRow label="Job Type" options={JOB_TYPES} value={jobType} onChange={setJobType} />
          <PickerRow label="Experience Level" options={EXP_LEVELS} value={expLevel} onChange={setExpLevel} />
          <PickerRow label="Work Mode" options={REMOTE_TYPES} value={remoteType} onChange={setRemoteType} />

          <View style={styles.salaryRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Min Salary (₹/yr)</Text>
              <TextInput style={styles.input} placeholder="e.g. 600000" value={salaryMin} onChangeText={setSalaryMin} keyboardType="numeric" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Max Salary (₹/yr)</Text>
              <TextInput style={styles.input} placeholder="e.g. 1200000" value={salaryMax} onChangeText={setSalaryMax} keyboardType="numeric" />
            </View>
          </View>

          <Field label="No. of Vacancies">
            <TextInput style={styles.input} placeholder="e.g. 2" value={vacancies} onChangeText={setVacancies} keyboardType="numeric" />
          </Field>

          <Field label="Skills Required">
            <TextInput
              style={styles.input}
              placeholder="React Native, TypeScript, Redux (comma-separated)"
              value={skills}
              onChangeText={setSkills}
            />
          </Field>

          <Field label="Requirements">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={"• 3+ years experience\n• Strong communication skills\n(one per line)"}
              value={requirements}
              onChangeText={setRequirements}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <Field label="Job Description" required>
            <TextInput
              style={[styles.input, styles.descInput]}
              placeholder="Describe the role, responsibilities, team, and what makes this opportunity great..."
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </Field>

          <TouchableOpacity
            style={[styles.saveBtn, isPending && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator color={Colors.textInverse} />
              : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  field: { gap: 6 },
  label: { ...Typography.label, color: Colors.text },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    ...Typography.body, color: Colors.text, backgroundColor: Colors.surface,
  },
  multiline: { minHeight: 100 },
  descInput: { minHeight: 160 },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 7, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipText: { ...Typography.caption, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },
  salaryRow: { flexDirection: 'row', gap: Spacing.sm },
  noticeBanner: {
    backgroundColor: Colors.warning + '18', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.warning + '40',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  noticeText: { ...Typography.bodySmall, color: Colors.warning, lineHeight: 18 },
  saveBtn: {
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
    borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center',
    backgroundColor: HeroColors.base, marginTop: Spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { ...Typography.label, color: Colors.textInverse, fontSize: 16, fontWeight: '700' },
});
