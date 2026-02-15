// WalletConnect polyfills — MUST be imported before any WC modules.
import '@walletconnect/react-native-compat';

import '../src/presentation/theme/global.css';

import React, { useEffect, useCallback } from 'react';
import { LogBox, View } from 'react-native';

// ---------------------------------------------------------------------------
// Suppress non-fatal WalletConnect SDK noise.
// The WC core calls console.error() for routine operations like expiring
// stale topics, which causes React Native's LogBox to show a red overlay.
// These are operational messages, not actual bugs.
// ---------------------------------------------------------------------------
LogBox.ignoreLogs([
  'No matching key. expirer',
  'No topics subscribed',
]);
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  AppQueryProvider,
  AuthProvider,
  ThemeProvider,
  WalletConnectProvider,
  NexCrossmintProvider,
  initializeDI,
} from '@presentation/providers';

// ---------------------------------------------------------------------------
// DI bootstrap — must run before any component resolves a service.
// Module-scope execution guarantees it happens before the first render.
// The function is idempotent, so hot-reload re-execution is safe.
// ---------------------------------------------------------------------------

initializeDI();

// ---------------------------------------------------------------------------
// Splash screen — keep visible until fonts are loaded
// ---------------------------------------------------------------------------

SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// Error boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // TODO: Report to Sentry / crash analytics
    console.error('[RootErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-page items-center justify-center px-6">
          <View className="bg-surface rounded-card p-card-padding border border-border items-center">
            {/* Inline text since design system may not be available */}
            <View className="mb-4">
              <View className="w-12 h-12 rounded-full bg-destructive/20 items-center justify-center">
                <View className="w-6 h-0.5 bg-destructive rotate-45" />
              </View>
            </View>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout() {
  // Load custom fonts here. System fonts (San Francisco / Roboto) are used
  // by default until Inter font files are added to ./assets/fonts/.
  //
  // To enable custom fonts, add .ttf files and uncomment:
  //   'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
  //   'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  //   'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  //   'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  const [fontsLoaded, fontError] = useFonts({});

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void onLayoutReady();
  }, [onLayoutReady]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppQueryProvider>
          <ThemeProvider>
            <NexCrossmintProvider>
              <WalletConnectProvider>
                <AuthProvider>
                <StatusBar style="light" backgroundColor="#141414" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#141414' },
                    animation: 'fade',
                  }}
                />
                </AuthProvider>
              </WalletConnectProvider>
            </NexCrossmintProvider>
          </ThemeProvider>
        </AppQueryProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
