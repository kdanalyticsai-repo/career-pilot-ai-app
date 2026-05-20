import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';

import { useAuthStore } from '@/stores/authStore';
import { registerForPushNotifications } from '@/services/pushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 2 * 60 * 1000 },
  },
});

export default function RootLayout() {
  const { hydrated, isAuthenticated, hydrate, user } = useAuthStore();

  useEffect(() => {
    hydrate();
    if (!__DEV__) {
      Updates.checkForUpdateAsync()
        .then(({ isAvailable }) => {
          if (isAvailable) {
            Updates.fetchUpdateAsync()
              .then(() => Updates.reloadAsync())
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace('/role-select' as any);
    } else if (user?.role === 'admin') {
      router.replace('/admin' as any);
    } else if (!user?.phone_verified) {
      router.replace('/(auth)/verify-phone' as any);
    } else if (!user?.onboarded) {
      if (user?.role === 'job_provider') {
        router.replace('/(auth)/onboarding/provider-setup' as any);
      } else {
        router.replace('/(auth)/onboarding/step1-profile');
      }
    } else {
      if (user?.role === 'job_provider') {
        router.replace('/(provider-tabs)/listings' as any);
      } else {
        router.replace('/(tabs)');
        registerForPushNotifications().catch(() => {});
      }
    }
  }, [hydrated, isAuthenticated, user?.phone_verified, user?.onboarded, user?.role]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="role-select" />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(provider-tabs)" />
              <Stack.Screen name="resume/[id]" options={{ headerShown: true, title: 'Resume' }} />
              <Stack.Screen name="resume/upload" options={{ headerShown: true, title: 'Upload Resume' }} />
              <Stack.Screen name="resume/[id]/edit/[section]" options={{ headerShown: true, title: 'Edit Section', presentation: 'modal' }} />
              <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Job Details' }} />
              <Stack.Screen name="jobs/[id]/tailor" options={{ headerShown: true, title: 'Tailor Resume', presentation: 'modal' }} />
              <Stack.Screen name="jobs/[id]/interview-prep" options={{ headerShown: true, title: 'Interview Prep' }} />
              <Stack.Screen name="jobs/[id]/cover-letter" options={{ headerShown: true, title: 'Cover Letter' }} />
              <Stack.Screen name="applications/[id]" options={{ headerShown: true, title: 'Application' }} />
              <Stack.Screen name="profile/edit" options={{ headerShown: true, title: 'Edit Profile' }} />
              <Stack.Screen name="profile/notifications" options={{ headerShown: true, title: 'Notifications' }} />
              <Stack.Screen name="profile/settings" options={{ headerShown: true, title: 'Settings' }} />
              <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="provider/jobs/[id]" options={{ headerShown: true, title: 'Listing Details' }} />
            </Stack>
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
