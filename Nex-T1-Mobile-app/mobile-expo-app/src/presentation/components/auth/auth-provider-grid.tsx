import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useAuth } from '@application/hooks/use-auth';
import { container, ServiceKeys } from '@application/container';
import type { IWalletManager } from '@domain/wallet/repositories/wallet-repository';
import type { OAuthProvider } from '@domain/auth/entities/user';
import { Text } from '@presentation/components/ui/text';
import {
  AuthProviderButton,
  type AuthProviderType,
} from '@presentation/components/auth/auth-provider-button';
import {
  getOAuthConfig,
  getOAuthRedirectUri,
} from '@infrastructure/auth/oauth-config';

// Ensure web browser sessions are completed on return
WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// Provider display order
// ---------------------------------------------------------------------------

const PROVIDERS: readonly AuthProviderType[] = [
  'metamask',
  'phantom',
  'apple',
  'google',
  'github',
  'discord',
  'twitter',
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthProviderGrid() {
  const { signInWithOAuth, signInWithApple, signInWithWallet, isLoading } =
    useAuth();
  const [activeProvider, setActiveProvider] = useState<AuthProviderType | null>(
    null,
  );

  const walletManager = React.useMemo(
    () => container.resolve<IWalletManager>(ServiceKeys.WalletManager),
    [],
  );

  // -----------------------------------------------------------------------
  // Wallet connect handler (MetaMask / Phantom)
  // -----------------------------------------------------------------------

  const handleWalletConnect = useCallback(async () => {
    setActiveProvider('metamask');
    try {
      const connectResult =
        await walletManager.connectWallet('walletconnect');
      if (!connectResult.ok) return;

      const wallet = connectResult.value;
      const nonce =
        Math.random().toString(36).substring(2) +
        Date.now().toString(36);
      const message = [
        'Sign this message to authenticate with Nex T1.',
        '',
        `Nonce: ${nonce}`,
        `Timestamp: ${new Date().toISOString()}`,
      ].join('\n');

      const signResult = await walletManager.signMessage(
        wallet.address,
        message,
      );
      if (!signResult.ok) return;

      const authResult = await signInWithWallet(
        wallet.address,
        signResult.value,
        message,
      );
      if (authResult.ok) {
        router.replace('/(app)/(tabs)/chat');
      }
    } finally {
      setActiveProvider(null);
    }
  }, [walletManager, signInWithWallet]);

  // -----------------------------------------------------------------------
  // Apple sign-in handler
  // -----------------------------------------------------------------------

  const handleAppleSignIn = useCallback(async () => {
    setActiveProvider('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken || !credential.authorizationCode) {
        return;
      }

      const result = await signInWithApple(
        credential.identityToken,
        credential.authorizationCode,
      );
      if (result.ok) {
        router.replace('/(app)/(tabs)/chat');
      }
    } catch {
      // User cancelled or error — signInWithApple sets error in store
    } finally {
      setActiveProvider(null);
    }
  }, [signInWithApple]);

  // -----------------------------------------------------------------------
  // OAuth handler (Google, GitHub, Discord, X)
  // -----------------------------------------------------------------------

  const handleOAuthSignIn = useCallback(
    async (provider: OAuthProvider) => {
      const config = getOAuthConfig(provider);
      if (!config) return;

      const providerKey = provider as AuthProviderType;
      setActiveProvider(providerKey);

      try {
        const redirectUri = getOAuthRedirectUri();

        const request = new AuthSession.AuthRequest({
          clientId: config.clientId,
          scopes: [...config.scopes],
          redirectUri,
          // X/Twitter requires PKCE
          usePKCE: provider === 'twitter',
        });

        const result = await request.promptAsync(config.discovery);

        if (result.type === 'success' && result.params['code']) {
          const authResult = await signInWithOAuth(
            provider,
            result.params['code'],
            redirectUri,
            provider === 'twitter' && request.codeVerifier
              ? { code_verifier: request.codeVerifier }
              : undefined,
          );
          if (authResult.ok) {
            router.replace('/(app)/(tabs)/chat');
          }
        }
      } finally {
        setActiveProvider(null);
      }
    },
    [signInWithOAuth],
  );

  // -----------------------------------------------------------------------
  // Dispatch press to the right handler
  // -----------------------------------------------------------------------

  const handlePress = useCallback(
    (provider: AuthProviderType) => {
      switch (provider) {
        case 'metamask':
        case 'phantom':
          void handleWalletConnect();
          break;
        case 'apple':
          void handleAppleSignIn();
          break;
        case 'google':
        case 'github':
        case 'discord':
        case 'twitter':
          void handleOAuthSignIn(provider);
          break;
      }
    },
    [handleWalletConnect, handleAppleSignIn, handleOAuthSignIn],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <View className="items-center">
      {/* Divider */}
      <View className="flex-row items-center w-full mb-4">
        <View className="flex-1 h-px bg-[#2a2a2c]" />
        <Text
          variant="caption"
          color="secondary"
          className="mx-3 text-xs"
        >
          or continue with
        </Text>
        <View className="flex-1 h-px bg-[#2a2a2c]" />
      </View>

      {/* Icon grid */}
      <View className="flex-row flex-wrap justify-center" style={{ gap: 10 }}>
        {PROVIDERS.map((provider) => (
          <AuthProviderButton
            key={provider}
            provider={provider}
            onPress={() => handlePress(provider)}
            loading={activeProvider === provider}
            disabled={isLoading || (activeProvider !== null && activeProvider !== provider)}
          />
        ))}
      </View>
    </View>
  );
}
