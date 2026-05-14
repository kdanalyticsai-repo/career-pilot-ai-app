export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export const POLL_INTERVAL_MS = 3000;
export const MAX_RESUME_POLL_ATTEMPTS = 40;  // 2 min total
export const MAX_FILE_SIZE_MB = 10;
