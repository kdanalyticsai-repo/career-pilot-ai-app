import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 2 * 60 * 1000 },
  },
});

export default function RootLayout() {
  const { hydrated, isAuthenticated, hydrate, user } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (!user?.onboarded) {
      router.replace('/(auth)/onboarding/step1-profile');
    } else {
      router.replace('/(tabs)');
    }
  }, [hydrated, isAuthenticated, user?.onboarded]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="resume/[id]" options={{ headerShown: true, title: 'Resume' }} />
              <Stack.Screen name="resume/upload" options={{ headerShown: true, title: 'Upload Resume' }} />
              <Stack.Screen name="resume/[id]/edit/[section]" options={{ headerShown: true, title: 'Edit Section', presentation: 'modal' }} />
              <Stack.Screen name="jobs/[id]" options={{ headerShown: true, title: 'Job Details' }} />
              <Stack.Screen name="jobs/[id]/tailor" options={{ headerShown: true, title: 'Tailor Resume', presentation: 'modal' }} />
              <Stack.Screen name="jobs/[id]/interview-prep" options={{ headerShown: true, title: 'Interview Prep' }} />
              <Stack.Screen name="jobs/[id]/cover-letter" options={{ headerShown: true, title: 'Cover Letter' }} />
              <Stack.Screen name="applications/[id]" options={{ headerShown: true, title: 'Application' }} />
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
