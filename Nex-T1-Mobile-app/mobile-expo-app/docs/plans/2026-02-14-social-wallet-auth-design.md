# Social & Wallet Authentication — Design Document

**Date:** 2026-02-14
**Status:** Approved
**Approach:** A — `expo-auth-session` + Mobile API Gateway

---

## Summary

Add 5 new authentication providers (Apple, Google, GitHub, Discord, X/Twitter) alongside
the existing wallet authentication. Replace the single "Connect Wallet" button with a grid
of 7 circular icon buttons: MetaMask, Phantom, Apple, Google, GitHub, Discord, X.

---

## New Dependencies

| Package | Purpose |
|---|---|
| `expo-auth-session` | OAuth2 authorization flow management |
| `expo-web-browser` | System browser for OAuth redirects |
| `expo-apple-authentication` | Native Apple Sign-In sheet (required by Apple) |

---

## Architecture Changes

### Domain Layer

**`src/domain/auth/entities/user.ts`** — Add:
```typescript
export type OAuthProvider = 'apple' | 'google' | 'github' | 'discord' | 'twitter';
```

**`src/domain/auth/repositories/auth-repository.ts`** — Add method:
```typescript
signInWithOAuth(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  extras?: Record<string, string>,
): Promise<Result<Session, DomainError>>;
```

### Application Layer

**New file: `src/application/auth/oauth-sign-in.use-case.ts`**
- Validates provider is a known `OAuthProvider`
- Validates code is non-empty
- Delegates to `IAuthRepository.signInWithOAuth()`
- Persists session to secure storage

**Update: `src/application/hooks/use-auth.ts`**
- Add `signInWithOAuth(provider, code, redirectUri, extras?)` method
- Add `signInWithApple()` convenience method (calls signInWithOAuth internally)

### Infrastructure Layer

**Update: `src/infrastructure/api/auth-api.ts`**
- Implement `signInWithOAuth()` → `POST /auth/oauth { provider, code, redirect_uri, ...extras }`

**New file: `src/infrastructure/auth/oauth-config.ts`**
- Per-provider OAuth configuration (authorization URL, token URL, client ID, scopes)
- Reads client IDs from `env.ts`

### Presentation Layer

**New: `src/presentation/components/auth/auth-provider-button.tsx`**
- Circular 48×48 button with SVG icon (24×24)
- Subtle border, press feedback
- `provider` prop determines icon and onPress behavior

**New: `src/presentation/components/auth/auth-provider-grid.tsx`**
- Horizontal row of `AuthProviderButton` components
- "or continue with" divider text above

**Update: `app/(auth)/login.tsx`**
- Remove full-width "Connect Wallet" button
- Add `AuthProviderGrid` between Sign In button and Sign Up link

**Update: `app/(auth)/register.tsx`**
- Add `AuthProviderGrid` between Create Account button and Sign In link

---

## Environment Variables

Add client-side accessible IDs (new):
```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID="787758556489-..."
EXPO_PUBLIC_GITHUB_CLIENT_ID="Ov23liH0Ge7VVmhOMCPi"
EXPO_PUBLIC_DISCORD_CLIENT_ID="1348777640819167322"
EXPO_PUBLIC_TWITTER_CLIENT_ID="ZkF6dlRzVGEtMzBfNThHT3ZraUU6MTpjaQ"
```

Secrets remain server-side only (unchanged).

Update `src/config/env.ts` schema to include the new variables.

---

## OAuth Flow

### Social Providers (Google, GitHub, Discord, X)

1. User taps icon button
2. `AuthSession.useAuthRequest()` builds provider-specific OAuth URL
3. System browser opens → user authenticates
4. Provider redirects back with authorization code
5. App sends `POST /auth/oauth { provider, code, redirect_uri }` to mobile API
6. Backend exchanges code for tokens, upserts user, returns `ApiSession`
7. `AuthApi.persistAndReturn()` stores tokens → `useAuth` updates state

### Apple Sign-In

1. User taps Apple button
2. `AppleAuthentication.signInAsync()` presents native iOS sheet
3. User authenticates (Face ID / Touch ID)
4. App receives `{ identityToken, authorizationCode, fullName, email }`
5. App sends `POST /auth/oauth { provider: 'apple', code, identity_token }`
6. Same backend flow as social providers

### Wallet Buttons (MetaMask, Phantom)

1. User taps MetaMask or Phantom icon
2. Uses existing WalletConnect flow (`handleConnectWallet`)
3. WalletConnect modal opens → user picks wallet or opens wallet app
4. Same signature challenge flow as current implementation

---

## UI Layout

```
┌──────────────────────────────────────┐
│          [Nexis Logo]                │
│      Welcome to Nex T1              │
│   Your AI-powered trading companion │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Email                          │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Password                       │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         Sign In                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ──────── or continue with ────────  │
│                                      │
│   (MM) (Ph) (🍎) (G) (GH) (Di) (X)  │
│                                      │
│    Don't have an account? Sign Up    │
└──────────────────────────────────────┘
```

Each icon: 48×48 circle, #1a1a1c background, 1px #2a2a2c border, 24×24 SVG icon inside.

---

## New Files

| File | Type |
|---|---|
| `src/application/auth/oauth-sign-in.use-case.ts` | New |
| `src/infrastructure/auth/oauth-config.ts` | New |
| `src/presentation/components/auth/auth-provider-button.tsx` | New |
| `src/presentation/components/auth/auth-provider-grid.tsx` | New |
| `assets/social-icons/apple.svg` | New |
| `assets/social-icons/discord.svg` | New |

## Modified Files

| File | Change |
|---|---|
| `src/domain/auth/entities/user.ts` | Add `OAuthProvider` type |
| `src/domain/auth/repositories/auth-repository.ts` | Add `signInWithOAuth` method |
| `src/infrastructure/api/auth-api.ts` | Implement `signInWithOAuth` |
| `src/application/hooks/use-auth.ts` | Add OAuth sign-in methods |
| `src/config/env.ts` | Add OAuth client ID vars |
| `app/(auth)/login.tsx` | Replace wallet button with provider grid |
| `app/(auth)/register.tsx` | Add provider grid |
| `.env` | Add `EXPO_PUBLIC_` OAuth client IDs |
| `package.json` | Add 3 new Expo packages |
