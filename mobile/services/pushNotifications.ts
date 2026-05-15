import { Platform } from 'react-native';
import { apiClient } from './api';

// NOTE: expo-notifications requires a native build to function.
// This service is implemented and ready — push notifications will
// activate automatically once a new EAS build is installed.

let Notifications: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
  if (Notifications) return Notifications;
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  const mod = await getNotificationsModule();
  if (!mod) return null;

  const { status: existingStatus } = await mod.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await mod.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const tokenData = await mod.getExpoPushTokenAsync();
    const token = tokenData.data;

    await apiClient.post('/notifications/push-token', {
      token,
      platform: Platform.OS,
    });

    return token;
  } catch {
    return null;
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  try {
    await apiClient.delete('/notifications/push-token', {
      data: { token, platform: Platform.OS },
    });
  } catch {
    // ignore
  }
}
