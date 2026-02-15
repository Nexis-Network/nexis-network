import { useMemo, useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

import type { IAuthRepository } from '@domain/auth/repositories/auth-repository';
import { useAuthStore } from '@application/stores';
import { container, ServiceKeys } from '@application/container';

// ---------------------------------------------------------------------------
// Session refresh constants
// ---------------------------------------------------------------------------

const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh if expiring within 5 min

// ---------------------------------------------------------------------------
// Authenticated app layout
// ---------------------------------------------------------------------------

/**
 * Auth guard wrapper for the main application routes.
 *
 * - Redirects to the login screen if no active session exists.
 * - Triggers session refresh on mount when the session is stale.
 */
export default function AppLayout() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);

  const authRepo = useMemo(
    () => container.resolve<IAuthRepository>(ServiceKeys.AuthRepository),
    [],
  );

  // Refresh session on mount if it is close to expiring
  useEffect(() => {
    if (!session) return;

    const now = Date.now();
    const expiresAt = session.expiresAt as number;

    if (expiresAt - now < REFRESH_THRESHOLD) {
      void authRepo.refreshSession().then((result) => {
        if (result.ok) {
          setSession(result.value);
        }
      });
    }
  }, [session, authRepo, setSession]);

  // Still loading initial auth state
  if (isLoading) {
    return (
      <View className="flex-1 bg-page items-center justify-center">
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  // Not authenticated -- redirect to login
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#141414' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="chat"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="wallet"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="agents"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="trading"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="settings"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ gestureEnabled: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="admin"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
