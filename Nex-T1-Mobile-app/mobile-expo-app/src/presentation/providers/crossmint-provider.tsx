import type { PropsWithChildren } from 'react';
import {
  CrossmintProvider,
  CrossmintWalletProvider,
} from '@crossmint/client-sdk-react-native-ui';

import { getEnv } from '@config/env';

/**
 * Wraps the Crossmint SDK providers with app configuration.
 *
 * `createOnLogin` is undefined because wallet creation is handled
 * explicitly during the onboarding flow, not automatically on login.
 */
export function NexCrossmintProvider({ children }: PropsWithChildren) {
  const env = getEnv();

  // Don't render Crossmint providers if the API key is missing
  if (!env.CROSSMINT_CLIENT_KEY) {
    return <>{children}</>;
  }

  return (
    <CrossmintProvider apiKey={env.CROSSMINT_CLIENT_KEY}>
      <CrossmintWalletProvider>
        {children}
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}
