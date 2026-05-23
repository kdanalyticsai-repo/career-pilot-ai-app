import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';
import { api } from '@/services/api';
import { API_URL } from '@/constants/config';
import { Colors, Typography, Spacing, Radius, HeroColors, Shadow } from '@/constants/theme';


export default function BulkPostScreen() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      await Linking.openURL(`${API_URL}/provider/jobs/bulk-template`);
    } catch {
      Alert.alert('Error', 'Could not open template link. Please contact support.');
    }
  };

  const handleBulkUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const name = file.name?.toLowerCase() ?? '';
      if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
        Alert.alert('Invalid File', 'Please upload a .csv or .xlsx file only.');
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as any);

      const res = await api.post('/provider/jobs/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { submitted, success_count, error_count, errors } = res.data;

      if (success_count === 0) {
        const errLines = errors.slice(0, 5).map((e: any) => `Row ${e.row}: ${e.message}`).join('\n');
        const more = error_count > 5 ? `\n…and ${error_count - 5} more errors.` : '';
        Alert.alert(
          'Upload Failed',
          `No jobs were submitted. Please fix the errors below and try again.\n\n${errLines}${more}`,
        );
      } else {
        let msg = `${success_count} of ${submitted} job${success_count !== 1 ? 's' : ''} submitted for admin review.\nA confirmation email has been sent to you.`;
        if (error_count > 0) {
          const errLines = errors.slice(0, 3).map((e: any) => `Row ${e.row}: ${e.message}`).join('\n');
          msg += `\n\n⚠️ ${error_count} row${error_count !== 1 ? 's' : ''} skipped:\n${errLines}`;
          if (error_count > 3) msg += `\n…and ${error_count - 3} more (see email for full list).`;
        }
        Alert.alert('Upload Complete', msg, [
          { text: 'View Listings', onPress: () => router.replace('/(provider-tabs)/listings' as any) },
          { text: 'OK' },
        ]);
        qc.invalidateQueries({ queryKey: ['provider-jobs'] });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Could not process the file. Please try again.';
      Alert.alert('Upload Error', detail);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={[styles.bulkCard, Shadow.sm]}>
          <View style={styles.bulkHeader}>
            <Text style={styles.bulkIcon}>📤</Text>
            <View style={styles.bulkHeaderText}>
              <Text style={styles.bulkTitle}>Bulk Job Upload</Text>
              <Text style={styles.bulkSub}>Upload 25+ jobs at once via Excel or CSV</Text>
            </View>
          </View>

          <View style={styles.bulkSteps}>
            <Text style={styles.bulkStep}>1. Download the template below</Text>
            <Text style={styles.bulkStep}>2. Fill in your jobs (min. 25 rows)</Text>
            <Text style={styles.bulkStep}>3. Upload the completed file</Text>
            <Text style={styles.bulkStep}>4. Jobs go to admin review — same as single listing</Text>
          </View>

          <TouchableOpacity style={styles.templateBtn} onPress={handleDownloadTemplate} activeOpacity={0.8}>
            <Text style={styles.templateBtnText}>↓  Download Sample Template (.xlsx)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bulkUploadBtn, uploading && styles.btnDisabled]}
            onPress={handleBulkUpload}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading
              ? <ActivityIndicator color={Colors.textInverse} />
              : <Text style={styles.bulkUploadBtnText}>↑  Upload Excel / CSV</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, Shadow.sm]}>
          <Text style={styles.infoTitle}>Template Format</Text>
          <Text style={styles.infoBody}>
            The Excel template includes columns for all required and optional fields:{'\n'}
            <Text style={styles.infoMono}>title, company, location, description, job_type, experience_level, remote_type, salary_min, salary_max, skills_required, requirements, vacancies</Text>
          </Text>
          <Text style={styles.infoNote}>
            • skills_required: comma-separated (e.g. React,TypeScript){'\n'}
            • requirements: pipe-separated (e.g. 3 yrs exp|Strong communication){'\n'}
            • salary values: annual INR (e.g. 600000 for ₹6 LPA){'\n'}
            • Minimum 25 rows required per upload
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  bulkCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30',
    gap: Spacing.md,
  },
  bulkHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bulkIcon: { fontSize: 28 },
  bulkHeaderText: { flex: 1 },
  bulkTitle: { ...Typography.h4, color: Colors.text },
  bulkSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  bulkSteps: { gap: 4 },
  bulkStep: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  templateBtn: {
    borderWidth: 1, borderColor: Colors.primary + '50',
    borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  templateBtnText: { ...Typography.label, color: Colors.primary, fontWeight: '600' },
  bulkUploadBtn: {
    borderWidth: 1, borderColor: 'rgba(91,46,255,0.3)',
    borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center',
    backgroundColor: HeroColors.base,
  },
  bulkUploadBtnText: { ...Typography.label, color: Colors.textInverse, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle, gap: Spacing.sm,
  },
  infoTitle: { ...Typography.h4, color: Colors.text },
  infoBody: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },
  infoMono: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  infoNote: { ...Typography.caption, color: Colors.textMuted, lineHeight: 20 },
});
