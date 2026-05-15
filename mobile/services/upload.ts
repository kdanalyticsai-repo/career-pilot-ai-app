import * as FileSystem from 'expo-file-system';
import { storage } from './storage';

export async function uploadResumePdf(uploadUrl: string, fileUri: string): Promise<void> {
  const isLocalEndpoint = uploadUrl.includes('/local-upload/');
  const token = isLocalEndpoint ? await storage.getAccessToken() : null;

  const headers: Record<string, string> = { 'Content-Type': 'application/pdf' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    mimeType: 'application/pdf',
    headers,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed: ${result.status} — ${result.body}`);
  }
}
