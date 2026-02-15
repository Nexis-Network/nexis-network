# Social & Wallet Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Apple, Google, GitHub, Discord, and X/Twitter social authentication alongside wallet auth, replacing the single "Connect Wallet" button with a grid of 7 circular icon buttons.

**Architecture:** Follows existing Clean Architecture. New `signInWithOAuth` method added to `IAuthRepository` interface, implemented in `AuthApi` via `POST /auth/oauth`. Native Apple Sign-In uses `expo-apple-authentication`. Social OAuth uses `expo-auth-session` with system browser. Wallet buttons reuse existing WalletConnect flow.

**Tech Stack:** expo-auth-session, expo-web-browser, expo-apple-authentication, react-native-svg (existing), NativeWind (existing), Zustand (existing)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `app.json` (add Apple Authentication plugin)

**Step 1: Install the 3 new Expo packages**

Run:
```bash
cd /Users/0xnexis/Downloads/Nexis-Network/Nex-T1-Mobile-app/mobile-expo-app
npx expo install expo-auth-session expo-web-browser expo-apple-authentication
```

Expected: packages added to `package.json` dependencies with Expo-compatible versions.

**Step 2: Add Apple Authentication plugin to `app.json`**

In `app.json`, add `"expo-apple-authentication"` to the `plugins` array (after `"expo-router"`):

```json
"plugins": [
  "expo-router",
  "expo-apple-authentication",
  "expo-secure-store",
  ...
]
```

**Step 3: Verify install**

Run: `npx expo doctor`
Expected: No critical issues.

**Step 4: Commit**

```bash
git add package.json app.json package-lock.json
git commit -m "chore: add expo-auth-session, expo-web-browser, expo-apple-authentication"
```

---

## Task 2: Add OAuthProvider Type to Domain Layer

**Files:**
- Modify: `src/domain/auth/entities/user.ts` (add type after `UserRole`)

**Step 1: Add the `OAuthProvider` type**

After the `UserRole` type (line 7), add:

```typescript
// ---------------------------------------------------------------------------
// OAuth providers
// ---------------------------------------------------------------------------

/**
 * Supported OAuth/social authentication providers.
 */
export type OAuthProvider = 'apple' | 'google' | 'github' | 'discord' | 'twitter';

/**
 * All known provider identifiers (OAuth + wallet).
 */
export type AuthProvider = OAuthProvider | 'email' | 'wallet';
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/domain/auth/entities/user.ts
git commit -m "feat(domain): add OAuthProvider and AuthProvider types"
```

---

## Task 3: Extend IAuthRepository Interface

**Files:**
- Modify: `src/domain/auth/repositories/auth-repository.ts`

**Step 1: Add `signInWithOAuth` to the interface**

Add this import at the top (line 3, after existing Session import):
```typescript
import type { OAuthProvider } from '@domain/auth/entities/user';
```

Add this method to the `IAuthRepository` interface (after `signInWithWallet`):

```typescript
  /**
   * Authenticate via an OAuth provider (Google, GitHub, Discord, X, Apple).
   *
   * @param provider    - The OAuth provider identifier.
   * @param code        - Authorization code from the OAuth flow.
   * @param redirectUri - The redirect URI used during the OAuth flow.
   * @param extras      - Provider-specific extra data (e.g. Apple identity token).
   */
  signInWithOAuth(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    extras?: Record<string, string>,
  ): Promise<Result<Session, DomainError>>;
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Error in `auth-api.ts` because it doesn't implement the new method yet. That's expected — we fix it in Task 5.

**Step 3: Commit**

```bash
git add src/domain/auth/repositories/auth-repository.ts
git commit -m "feat(domain): add signInWithOAuth to IAuthRepository"
```

---

## Task 4: Update Environment Config

**Files:**
- Modify: `.env` (add EXPO_PUBLIC_ OAuth client IDs)
- Modify: `src/config/env.ts` (add OAuth vars to schema)

**Step 1: Add EXPO_PUBLIC_ prefixed vars to `.env`**

Append after the existing `EXPO_PUBLIC_DEV_AUTH_BYPASS` line:

```env
# OAuth Client IDs (public - safe for client-side)
EXPO_PUBLIC_GOOGLE_CLIENT_ID="787758556489-vu5vmk8h83qlf0unsc87cs358deidrh4.apps.googleusercontent.com"
EXPO_PUBLIC_GITHUB_CLIENT_ID="Ov23liH0Ge7VVmhOMCPi"
EXPO_PUBLIC_DISCORD_CLIENT_ID="1348777640819167322"
EXPO_PUBLIC_TWITTER_CLIENT_ID="ZkF6dlRzVGEtMzBfNThHT3ZraUU6MTpjaQ"
```

**Step 2: Update `src/config/env.ts` schema**

Add to the `envSchema` z.object (after `SENTRY_DSN`):

```typescript
  // OAuth Client IDs (public)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),
```

Add to the `raw` object in `loadEnv()` (after the SENTRY_DSN line):

```typescript
    GOOGLE_CLIENT_ID: extra.googleClientId ?? process.env['EXPO_PUBLIC_GOOGLE_CLIENT_ID'],
    GITHUB_CLIENT_ID: extra.githubClientId ?? process.env['EXPO_PUBLIC_GITHUB_CLIENT_ID'],
    DISCORD_CLIENT_ID: extra.discordClientId ?? process.env['EXPO_PUBLIC_DISCORD_CLIENT_ID'],
    TWITTER_CLIENT_ID: extra.twitterClientId ?? process.env['EXPO_PUBLIC_TWITTER_CLIENT_ID'],
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Passes (or only the auth-api.ts error from Task 3).

**Step 4: Commit**

```bash
git add .env src/config/env.ts
git commit -m "feat(config): add OAuth client IDs to env schema"
```

---

## Task 5: Implement AuthApi.signInWithOAuth

**Files:**
- Modify: `src/infrastructure/api/auth-api.ts`

**Step 1: Add the import**

Add to imports at top of file:
```typescript
import type { OAuthProvider } from '@domain/auth/entities/user';
```

**Step 2: Implement signInWithOAuth in AuthApi class**

Add this method after `signInWithWallet` (around line 120):

```typescript
  async signInWithOAuth(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    extras?: Record<string, string>,
  ): Promise<Result<Session, DomainError>> {
    const result = await this.api.post<ApiSession>('/auth/oauth', {
      provider,
      code,
      redirect_uri: redirectUri,
      ...extras,
    });

    if (!result.ok) return result;
    return this.persistAndReturn(result.value);
  }
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors — `AuthApi` now implements the full `IAuthRepository` interface.

**Step 4: Commit**

```bash
git add src/infrastructure/api/auth-api.ts
git commit -m "feat(infra): implement signInWithOAuth in AuthApi"
```

---

## Task 6: Create OAuth Config

**Files:**
- Create: `src/infrastructure/auth/oauth-config.ts`

**Step 1: Create the OAuth config file**

```typescript
/**
 * OAuth provider configurations for expo-auth-session.
 *
 * Each provider defines:
 * - authorizationEndpoint: Where the user authenticates
 * - tokenEndpoint: Where codes are exchanged (server-side)
 * - clientId: Public client ID from env
 * - scopes: Requested permissions
 */

import { makeRedirectUri } from 'expo-auth-session';
import { getEnv } from '@config/env';
import type { OAuthProvider } from '@domain/auth/entities/user';

// ---------------------------------------------------------------------------
// Redirect URI
// ---------------------------------------------------------------------------

/**
 * Generates the redirect URI for OAuth callbacks.
 * Uses the `nex-t1` scheme defined in app.json.
 */
export function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'nex-t1',
    path: 'auth/callback',
  });
}

// ---------------------------------------------------------------------------
// Provider discovery documents
// ---------------------------------------------------------------------------

interface OAuthProviderConfig {
  readonly clientId: string;
  readonly scopes: readonly string[];
  readonly discovery: {
    readonly authorizationEndpoint: string;
    readonly tokenEndpoint: string;
    readonly revocationEndpoint?: string;
  };
}

export function getOAuthConfig(provider: OAuthProvider): OAuthProviderConfig | null {
  const env = getEnv();

  switch (provider) {
    case 'google':
      return env.GOOGLE_CLIENT_ID
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            scopes: ['openid', 'profile', 'email'],
            discovery: {
              authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
              tokenEndpoint: 'https://oauth2.googleapis.com/token',
              revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
            },
          }
        : null;

    case 'github':
      return env.GITHUB_CLIENT_ID
        ? {
            clientId: env.GITHUB_CLIENT_ID,
            scopes: ['read:user', 'user:email'],
            discovery: {
              authorizationEndpoint: 'https://github.com/login/oauth/authorize',
              tokenEndpoint: 'https://github.com/login/oauth/access_token',
            },
          }
        : null;

    case 'discord':
      return env.DISCORD_CLIENT_ID
        ? {
            clientId: env.DISCORD_CLIENT_ID,
            scopes: ['identify', 'email'],
            discovery: {
              authorizationEndpoint: 'https://discord.com/oauth2/authorize',
              tokenEndpoint: 'https://discord.com/api/oauth2/token',
              revocationEndpoint: 'https://discord.com/api/oauth2/token/revoke',
            },
          }
        : null;

    case 'twitter':
      return env.TWITTER_CLIENT_ID
        ? {
            clientId: env.TWITTER_CLIENT_ID,
            scopes: ['users.read', 'tweet.read'],
            discovery: {
              authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
              tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
              revocationEndpoint: 'https://api.twitter.com/2/oauth2/revoke',
            },
          }
        : null;

    case 'apple':
      // Apple uses native flow, not expo-auth-session
      return null;

    default:
      return null;
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/infrastructure/auth/oauth-config.ts
git commit -m "feat(infra): add OAuth provider configurations"
```

---

## Task 7: Create OAuthSignInUseCase

**Files:**
- Create: `src/application/auth/oauth-sign-in.use-case.ts`

**Step 1: Create the use case**

```typescript
/**
 * OAuth Sign-In Use Case
 *
 * Orchestrates OAuth authentication by validating the provider and code,
 * delegating to IAuthRepository.signInWithOAuth, and persisting the session.
 */

import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';
import { ValidationError } from '@domain/common/errors/domain-error';
import type { Session, OAuthProvider } from '@domain/auth/entities/user';
import type { IAuthRepository } from '@domain/auth/repositories/auth-repository';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';
import { failure, success } from '@domain/common/types';

// ---------------------------------------------------------------------------
// Valid providers
// ---------------------------------------------------------------------------

const VALID_PROVIDERS: ReadonlySet<OAuthProvider> = new Set([
  'apple',
  'google',
  'github',
  'discord',
  'twitter',
]);

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const SESSION_KEY = 'nex_session';

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

export class OAuthSignInUseCase {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly secureStorage: ISecureStorage,
  ) {}

  /**
   * Authenticate via an OAuth provider.
   *
   * 1. Validates the provider is supported.
   * 2. Validates the authorization code is non-empty.
   * 3. Delegates to IAuthRepository.signInWithOAuth().
   * 4. Persists session tokens on success.
   */
  async execute(
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    extras?: Record<string, string>,
  ): Promise<Result<Session, DomainError>> {
    // --- Validate provider ---
    if (!VALID_PROVIDERS.has(provider)) {
      return failure(
        new ValidationError(`Unsupported OAuth provider: ${provider}`, 'provider'),
      );
    }

    // --- Validate code ---
    if (!code || code.trim().length === 0) {
      return failure(
        new ValidationError('Authorization code must not be empty', 'code'),
      );
    }

    // --- Validate redirect URI ---
    if (!redirectUri || redirectUri.trim().length === 0) {
      return failure(
        new ValidationError('Redirect URI must not be empty', 'redirectUri'),
      );
    }

    // --- Authenticate via repository ---
    const result = await this.authRepository.signInWithOAuth(
      provider,
      code,
      redirectUri,
      extras,
    );

    if (!result.ok) {
      return result;
    }

    // --- Persist session tokens ---
    try {
      await this.secureStorage.setItem(SESSION_KEY, JSON.stringify({
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
        expiresAt: result.value.expiresAt,
      }));
    } catch {
      // Storage failure is non-fatal.
    }

    return success(result.value);
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/application/auth/oauth-sign-in.use-case.ts
git commit -m "feat(app): add OAuthSignInUseCase"
```

---

## Task 8: Update useAuth Hook

**Files:**
- Modify: `src/application/hooks/use-auth.ts`

**Step 1: Add imports**

Add at top (after existing imports from `@application/auth/`):

```typescript
import { OAuthSignInUseCase } from '@application/auth/oauth-sign-in.use-case';
import type { OAuthProvider } from '@domain/auth/entities/user';
```

**Step 2: Update UseAuthReturn interface**

Add these two methods to the `UseAuthReturn` interface (after `signInWithWallet`):

```typescript
  /** Authenticate via OAuth provider (Google, GitHub, Discord, X). */
  signInWithOAuth: (
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    extras?: Record<string, string>,
  ) => Promise<Result<Session, DomainError>>;
  /** Authenticate via Apple Sign-In (convenience wrapper). */
  signInWithApple: (
    identityToken: string,
    authorizationCode: string,
  ) => Promise<Result<Session, DomainError>>;
```

**Step 3: Add oauthSignInUseCase memoization**

After the `signOutUseCase` memo (around line 111), add:

```typescript
  const oauthSignInUseCase = useMemo(
    () => new OAuthSignInUseCase(authRepo, secureStorage),
    [authRepo, secureStorage],
  );
```

**Step 4: Add signInWithOAuth action**

After the `signInWithWallet` callback (around line 236), add:

```typescript
  const signInWithOAuth = useCallback(
    async (
      provider: OAuthProvider,
      code: string,
      redirectUri: string,
      extras?: Record<string, string>,
    ): Promise<Result<Session, DomainError>> => {
      setLoading(true);
      setError(null);

      const result = await oauthSignInUseCase.execute(provider, code, redirectUri, extras);

      if (result.ok) {
        setSession(result.value);
      } else {
        setError(result.error.message);
      }

      setLoading(false);
      return result;
    },
    [oauthSignInUseCase, setSession, setLoading, setError],
  );

  const signInWithApple = useCallback(
    async (
      identityToken: string,
      authorizationCode: string,
    ): Promise<Result<Session, DomainError>> => {
      return signInWithOAuth('apple', authorizationCode, '', {
        identity_token: identityToken,
      });
    },
    [signInWithOAuth],
  );
```

**Step 5: Add to return object**

Update the return object to include the new methods:

```typescript
  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithWallet,
    signInWithOAuth,
    signInWithApple,
    signOut,
  };
```

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 7: Commit**

```bash
git add src/application/hooks/use-auth.ts
git commit -m "feat(app): add signInWithOAuth and signInWithApple to useAuth hook"
```

---

## Task 9: Create SVG Icon Assets

**Files:**
- Create: `assets/social-icons/apple.svg`
- Create: `assets/social-icons/discord.svg`

**Step 1: Create Apple SVG icon**

Create `assets/social-icons/apple.svg` with a white Apple logo on transparent background, matching the gradient style of existing social icons:

```svg
<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.769 11.574c-.023-2.318 1.891-3.432 1.977-3.484-1.076-1.574-2.752-1.789-3.349-1.814-1.426-.145-2.783.84-3.509.84-.726 0-1.848-.818-3.036-.797-1.562.023-3.003.909-3.808 2.307-1.623 2.818-.415 6.991 1.166 9.278.773 1.119 1.694 2.375 2.906 2.33 1.166-.047 1.606-.754 3.015-.754 1.41 0 1.803.754 3.036.73 1.254-.023 2.049-1.141 2.818-2.262.889-1.297 1.254-2.553 1.277-2.618-.028-.013-2.45-.941-2.493-3.756zM13.441 4.647c.643-.779 1.076-1.861.958-2.94-.926.038-2.049.617-2.714 1.395-.596.69-1.118 1.793-.978 2.85 1.034.08 2.089-.525 2.734-1.305z" fill="url(#paint0_linear_apple)"/>
<defs>
<linearGradient id="paint0_linear_apple" x1="11" y1="1.707" x2="11" y2="20.231" gradientUnits="userSpaceOnUse">
<stop stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0.6"/>
</linearGradient>
</defs>
</svg>
```

**Step 2: Create Discord SVG icon**

Create `assets/social-icons/discord.svg`:

```svg
<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.223 4.574a17.1 17.1 0 00-4.224-1.31.064.064 0 00-.068.032c-.182.324-.384.747-.526 1.08a15.79 15.79 0 00-4.808 0 11.12 11.12 0 00-.534-1.08.067.067 0 00-.068-.032 17.06 17.06 0 00-4.224 1.31.06.06 0 00-.028.024C1.396 8.19.674 11.69 1.03 15.142a.071.071 0 00.027.049 17.19 17.19 0 005.176 2.617.067.067 0 00.073-.024c.399-.544.754-1.118 1.06-1.722a.066.066 0 00-.036-.092 11.32 11.32 0 01-1.617-.77.067.067 0 01-.007-.111c.109-.081.217-.166.321-.251a.064.064 0 01.067-.009c3.392 1.549 7.065 1.549 10.418 0a.064.064 0 01.068.008c.104.086.213.171.322.252a.067.067 0 01-.005.111c-.516.301-1.053.557-1.618.77a.066.066 0 00-.035.093c.31.603.666 1.177 1.058 1.721a.067.067 0 00.073.025 17.14 17.14 0 005.184-2.617.067.067 0 00.027-.048c.425-4.401-.712-8.222-3.016-11.607a.053.053 0 00-.027-.025zM7.685 13.063c-1.005 0-1.833-.922-1.833-2.056 0-1.133.813-2.055 1.833-2.055 1.028 0 1.849.93 1.833 2.055 0 1.134-.813 2.056-1.833 2.056zm6.776 0c-1.005 0-1.833-.922-1.833-2.056 0-1.133.813-2.055 1.833-2.055 1.028 0 1.849.93 1.833 2.055 0 1.134-.805 2.056-1.833 2.056z" fill="url(#paint0_linear_discord)"/>
<defs>
<linearGradient id="paint0_linear_discord" x1="11" y1="3.194" x2="11" y2="17.808" gradientUnits="userSpaceOnUse">
<stop stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0.6"/>
</linearGradient>
</defs>
</svg>
```

**Step 3: Commit**

```bash
git add assets/social-icons/apple.svg assets/social-icons/discord.svg
git commit -m "feat(assets): add Apple and Discord social icons"
```

---

## Task 10: Create AuthProviderButton Component

**Files:**
- Create: `src/presentation/components/auth/auth-provider-button.tsx`

**Step 1: Create the component**

```typescript
import React, { useCallback } from 'react';
import { Pressable, ActivityIndicator, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// ---------------------------------------------------------------------------
// Provider icon map
// ---------------------------------------------------------------------------

const providerIcons = {
  metamask: require('../../../../assets/chain-icons/MetaMask.svg'),
  phantom: require('../../../../assets/chain-icons/Phantom.svg'),
  apple: require('../../../../assets/social-icons/apple.svg'),
  google: require('../../../../assets/social-icons/google.svg'),
  github: require('../../../../assets/social-icons/github.svg'),
  discord: require('../../../../assets/social-icons/discord.svg'),
  twitter: require('../../../../assets/social-icons/x.svg'),
} as const;

export type AuthProviderType = keyof typeof providerIcons;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AuthProviderButtonProps {
  /** Which provider this button represents. */
  provider: AuthProviderType;
  /** Called when the button is pressed. */
  onPress: () => void;
  /** Whether an auth operation is in-flight for this specific provider. */
  loading?: boolean;
  /** Whether the button should be disabled. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AuthProviderButton({
  provider,
  onPress,
  loading = false,
  disabled = false,
}: AuthProviderButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityLabel={`Sign in with ${provider}`}
      accessibilityRole="button"
      style={({ pressed }: { pressed: boolean }): ViewStyle => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1a1a1c',
        borderWidth: 1,
        borderColor: pressed && !isDisabled ? '#3a3a3c' : '#2a2a2c',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isDisabled ? 0.5 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Image
          source={providerIcons[provider]}
          style={{ width: 24, height: 24 }}
          contentFit="contain"
        />
      )}
    </Pressable>
  );
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/presentation/components/auth/auth-provider-button.tsx
git commit -m "feat(ui): create AuthProviderButton component"
```

---

## Task 11: Create AuthProviderGrid Component

**Files:**
- Create: `src/presentation/components/auth/auth-provider-grid.tsx`

**Step 1: Create the component**

```typescript
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
      <View className="flex-row flex-wrap justify-center" style={{ gap: 12 }}>
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
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/presentation/components/auth/auth-provider-grid.tsx
git commit -m "feat(ui): create AuthProviderGrid with OAuth and wallet handlers"
```

---

## Task 12: Update Login Screen

**Files:**
- Modify: `app/(auth)/login.tsx`

**Step 1: Add AuthProviderGrid import**

Add after the existing imports:

```typescript
import { AuthProviderGrid } from '@presentation/components/auth/auth-provider-grid';
```

**Step 2: Remove wallet-related code**

Remove these imports (no longer needed in this file):
- `useMemo, useState` can remove `useState` (keep `useCallback`)
- Remove `container, ServiceKeys` import
- Remove `IWalletManager` import
- Remove the `walletLoading` state
- Remove the `walletManager` memo
- Remove the `handleConnectWallet` callback

**Step 3: Replace the Connect Wallet button with AuthProviderGrid**

Replace the "Connect Wallet" `<Button>` section with:

```tsx
          {/* Auth providers */}
          <AuthProviderGrid />
```

Also update the Sign In button to remove `disabled={walletLoading}` (just use `disabled={isLoading}`).

**Step 4: Add bottom spacing**

Add `className="mb-4"` to the AuthProviderGrid wrapper or add a spacer `<View>` before the Sign Up link.

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add app/\(auth\)/login.tsx
git commit -m "feat(ui): replace Connect Wallet with AuthProviderGrid on login screen"
```

---

## Task 13: Update Register Screen

**Files:**
- Modify: `app/(auth)/register.tsx`

**Step 1: Add AuthProviderGrid import**

```typescript
import { AuthProviderGrid } from '@presentation/components/auth/auth-provider-grid';
```

**Step 2: Add AuthProviderGrid between Create Account button and Sign In link**

After the Create Account `<Button>` and before the Sign In link `<View>`, add:

```tsx
          {/* Auth providers */}
          <View className="mb-4">
            <AuthProviderGrid />
          </View>
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add app/\(auth\)/register.tsx
git commit -m "feat(ui): add AuthProviderGrid to register screen"
```

---

## Task 14: Final Verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 2: Lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing ones).

**Step 3: Start dev server and visual check**

Run: `npx expo start`
Expected: App loads, login screen shows 7 icon buttons in a row below the "or continue with" divider.

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address lint/type issues from social auth implementation"
```
