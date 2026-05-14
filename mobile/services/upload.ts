import { api } from './api';
import { storage } from './storage';
import { API_URL } from '@/constants/config';

/**
 * Uploads a PDF to either S3 (via presigned URL) or the local-disk endpoint,
 * depending on what the server returns as upload_url.
 */
export async function uploadResumePdf(uploadUrl: string, fileUri: string): Promise<void> {
  const isLocalEndpoint = uploadUrl.includes('/local-upload/');

  const fileBlob = await fetch(fileUri).then((r) => r.blob());

  if (isLocalEndpoint) {
    // Local fallback: send directly to our FastAPI endpoint with auth header
    const token = await storage.getAccessToken();
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: {
        'Content-Type': 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  } else {
    // S3 pre-signed URL: no auth header (S3 rejects extra headers)
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBlob,
      headers: { 'Content-Type': 'application/pdf' },
    });
    if (!response.ok) throw new Error(`S3 upload failed: ${response.status}`);
  }
}
