import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding/step1-profile" />
      <Stack.Screen name="onboarding/step2-preferences" />
      <Stack.Screen name="onboarding/step3-resume" />
      <Stack.Screen name="onboarding/provider-setup" />
    </Stack>
  );
}
