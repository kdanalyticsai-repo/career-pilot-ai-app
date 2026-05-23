import * as FileSystem from 'expo-file-system/legacy';
import { storage } from './storage';

export async function uploadResumePdf(uploadUrl: string, fileUri: string): Promise<void> {
  const isLocalEndpoint = uploadUrl.includes('/local-upload/');
  const token = isLocalEndpoint ? await storage.getAccessToken() : null;

  const headers: Record<string, string> = { 'Content-Type': 'application/pdf' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'PUT',
    uploadType: 0, // FileSystemUploadType.BINARY_CONTENT
    headers,
  });

  if (result.status < 200 || result.status >= 300) {
    const err: any = new Error(`Storage upload failed (${result.status})`);
    err.response = { status: result.status, data: { detail: result.body || `Upload failed with status ${result.status}` } };
    throw err;
  }
}
