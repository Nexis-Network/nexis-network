import { Stack } from 'expo-router';

/**
 * Onboarding stack layout.
 * Back gesture is disabled to prevent users from skipping steps.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: '#141414' },
        animation: 'slide_from_right',
      }}
    />
  );
}
