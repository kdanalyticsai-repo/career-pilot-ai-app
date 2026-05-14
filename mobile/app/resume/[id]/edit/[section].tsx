import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

export default function SectionEditorScreen() {
  const { id, section } = useLocalSearchParams<{ id: string; section: string }>();
  const queryClient = useQueryClient();

  const { data: resume, isLoading } = useQuery({
    queryKey: ['resume', id],
    queryFn: () => api.get(`/resumes/${id}`).then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (content: unknown) =>
      api.patch(`/resumes/${id}/sections/${section}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resume', id] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Failed to save changes. Please try again.'),
  });

  if (isLoading || !resume) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const sectionData = resume.structured_data?.[section as string];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <SectionEditor
        section={section as string}
        data={sectionData}
        saving={mutation.isPending}
        onSave={(content) => mutation.mutate(content)}
      />
    </SafeAreaView>
  );
}

function SectionEditor({
  section, data, saving, onSave,
}: {
  section: string;
  data: unknown;
  saving: boolean;
  onSave: (content: unknown) => void;
}) {
  switch (section) {
    case 'summary':
      return <SummaryEditor data={data as string} saving={saving} onSave={onSave} />;
    case 'skills':
      return <SkillsEditor data={data as Record<string, string[]>} saving={saving} onSave={onSave} />;
    case 'experience':
      return <ExperienceEditor data={data as ExperienceEntry[]} saving={saving} onSave={onSave} />;
    case 'contact':
      return <ContactEditor data={data as Record<string, string>} saving={saving} onSave={onSave} />;
    default:
      return (
        <View style={styles.center}>
          <Text style={styles.unsupported}>Editor for "{section}" coming soon.</Text>
        </View>
      );
  }
}

/* ── Summary editor ── */
function SummaryEditor({ data, saving, onSave }: { data: string; saving: boolean; onSave: (v: unknown) => void }) {
  const [text, setText] = useState(data ?? '');
  return (
    <EditorShell title="Edit Summary" saving={saving} onSave={() => onSave(text)}>
      <TextInput
        style={[styles.textArea, styles.input]}
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={6}
        placeholder="Write a professional summary..."
        placeholderTextColor={Colors.textMuted}
      />
      <Text style={styles.hint}>{text.length} characters — aim for 3–4 sentences</Text>
    </EditorShell>
  );
}

/* ── Skills editor ── */
function SkillsEditor({
  data, saving, onSave,
}: {
  data: Record<string, string[]>;
  saving: boolean;
  onSave: (v: unknown) => void;
}) {
  const [technical, setTechnical] = useState<string[]>(data?.technical ?? []);
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !technical.includes(trimmed)) {
      setTechnical([...technical, trimmed]);
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string) => setTechnical(technical.filter((s) => s !== skill));

  return (
    <EditorShell
      title="Edit Skills"
      saving={saving}
      onSave={() => onSave({ ...data, technical })}
    >
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={newSkill}
          onChangeText={setNewSkill}
          placeholder="Add a skill..."
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={addSkill}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={addSkill}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chips}>
        {technical.map((skill) => (
          <TouchableOpacity key={skill} style={styles.chip} onPress={() => removeSkill(skill)}>
            <Text style={styles.chipText}>{skill}</Text>
            <Text style={styles.chipRemove}>×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>Tap a skill to remove it</Text>
    </EditorShell>
  );
}

/* ── Experience editor ── */
type ExperienceEntry = {
  company: string;
  title: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  bullets: string[];
  technologies: string[];
};

function ExperienceEditor({
  data, saving, onSave,
}: {
  data: ExperienceEntry[];
  saving: boolean;
  onSave: (v: unknown) => void;
}) {
  const [entries, setEntries] = useState<ExperienceEntry[]>(data ?? []);
  const [expanded, setExpanded] = useState<number | null>(0);

  const updateBullet = (entryIdx: number, bulletIdx: number, text: string) => {
    const updated = entries.map((e, i) =>
      i === entryIdx
        ? { ...e, bullets: e.bullets.map((b, j) => (j === bulletIdx ? text : b)) }
        : e
    );
    setEntries(updated);
  };

  const addBullet = (entryIdx: number) => {
    const updated = entries.map((e, i) =>
      i === entryIdx ? { ...e, bullets: [...(e.bullets ?? []), ''] } : e
    );
    setEntries(updated);
  };

  const removeBullet = (entryIdx: number, bulletIdx: number) => {
    const updated = entries.map((e, i) =>
      i === entryIdx
        ? { ...e, bullets: e.bullets.filter((_, j) => j !== bulletIdx) }
        : e
    );
    setEntries(updated);
  };

  return (
    <EditorShell title="Edit Experience" saving={saving} onSave={() => onSave(entries)}>
      {entries.map((entry, i) => (
        <View key={i} style={[styles.expCard, Shadow.sm]}>
          <TouchableOpacity onPress={() => setExpanded(expanded === i ? null : i)} style={styles.expHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expTitle}>{entry.title}</Text>
              <Text style={styles.expCompany}>{entry.company}</Text>
            </View>
            <Text style={styles.chevron}>{expanded === i ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {expanded === i && (
            <View style={styles.expBody}>
              <Text style={styles.bulletLabel}>Bullet Points</Text>
              {entry.bullets?.map((bullet, j) => (
                <View key={j} style={styles.bulletRow}>
                  <TextInput
                    style={[styles.input, styles.bulletInput]}
                    value={bullet}
                    onChangeText={(t) => updateBullet(i, j, t)}
                    multiline
                    placeholder="Describe your achievement..."
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TouchableOpacity onPress={() => removeBullet(i, j)} hitSlop={8}>
                    <Text style={styles.removeBtn}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addBulletBtn} onPress={() => addBullet(i)}>
                <Text style={styles.addBulletText}>+ Add bullet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </EditorShell>
  );
}

/* ── Contact editor ── */
function ContactEditor({
  data, saving, onSave,
}: {
  data: Record<string, string>;
  saving: boolean;
  onSave: (v: unknown) => void;
}) {
  const [fields, setFields] = useState({ ...data });
  const update = (key: string, val: string) => setFields((f) => ({ ...f, [key]: val }));

  const contactFields = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'location', label: 'Location' },
    { key: 'linkedin', label: 'LinkedIn URL' },
    { key: 'github', label: 'GitHub URL' },
  ];

  return (
    <EditorShell title="Edit Contact" saving={saving} onSave={() => onSave(fields)}>
      {contactFields.map(({ key, label }) => (
        <View key={key} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={styles.input}
            value={fields[key] ?? ''}
            onChangeText={(v) => update(key, v)}
            placeholder={label}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
        </View>
      ))}
    </EditorShell>
  );
}

/* ── Shared shell ── */
function EditorShell({
  title, children, saving, onSave,
}: {
  title: string;
  children: React.ReactNode;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <View style={styles.shellContainer}>
      <ScrollView contentContainerStyle={styles.shellScroll} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={onSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Text style={styles.saveText}>Save & Re-score</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  unsupported: { ...Typography.body, color: Colors.textMuted },

  shellContainer: { flex: 1 },
  shellScroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },

  footer: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { ...Typography.label, color: Colors.textSecondary },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },

  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.body, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  hint: { ...Typography.caption, color: Colors.textMuted },

  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: Radius.md,
  },
  addBtnText: { ...Typography.label, color: Colors.textInverse },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary + '15', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  chipText: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },
  chipRemove: { color: Colors.primary, fontSize: 16, fontWeight: '700', lineHeight: 18 },

  expCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
  },
  expHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.sm,
  },
  expTitle: { ...Typography.label, color: Colors.text },
  expCompany: { ...Typography.bodySmall, color: Colors.textSecondary },
  chevron: { color: Colors.textMuted, fontSize: 12 },
  expBody: { padding: Spacing.md, paddingTop: 0, gap: Spacing.sm },
  bulletLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletInput: { flex: 1, minHeight: 56 },
  removeBtn: { color: Colors.danger, fontSize: 20, fontWeight: '700', paddingTop: 8 },
  addBulletBtn: { alignSelf: 'flex-start' },
  addBulletText: { ...Typography.bodySmall, color: Colors.primary, fontWeight: '600' },

  fieldRow: { gap: 4 },
  fieldLabel: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
});
