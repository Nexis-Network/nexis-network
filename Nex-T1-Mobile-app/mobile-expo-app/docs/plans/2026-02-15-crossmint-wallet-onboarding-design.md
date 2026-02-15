# Crossmint Smart Wallet Onboarding — Design Document

**Date:** 2026-02-15
**Status:** Approved
**Author:** Claude Opus 4.6 + 0xnexis

## 1. Overview

Implement a post-auth mandatory onboarding flow that creates EVM, Solana, and Stellar smart wallets via Crossmint's React Native SDK. Integrates with the existing Supabase authentication via Bring Your Own Auth (JWT passthrough), supports Jupiter token swaps on Solana, and provides biometric-gated private key export.

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wallet coexistence | Crossmint primary, WalletConnect for external | Users get smart wallets automatically; can still connect MetaMask/Phantom |
| Auth bridge | Supabase JWT direct | No new server endpoints; configure Crossmint Console to validate Supabase JWTs |
| Onboarding position | Post-auth mandatory | Every user gets wallets; flag in SecureStore skips on subsequent logins |
| Architecture | Adapter Pattern (A) | Crossmint as infrastructure adapter behind `IWalletManager` + new `ICrossmintWalletService` port |

## 2. Domain Model Changes

### 2.1 Wallet Entity Modifications

File: `src/domain/wallet/entities/wallet.ts`

```typescript
// CHANGE: Add 'stellar' to ChainType
export type ChainType = 'evm' | 'solana' | 'sui' | 'stellar';

// NEW: Wallet provider discriminator
export type WalletProviderType = 'crossmint' | 'walletconnect' | 'safe';

export interface Wallet {
  readonly id: UUID;
  readonly address: string;
  readonly chainType: ChainType;
  readonly chainId?: number | undefined;
  readonly label: string;
  readonly isPrimary: boolean;
  readonly safeVersion: string | undefined;
  readonly deploymentStatus: DeploymentStatus;
  readonly walletProvider: WalletProviderType;       // NEW
  readonly crossmintWalletId?: string | undefined;   // NEW
}
```

### 2.2 New Domain Port: ICrossmintWalletService

File: `src/domain/wallet/ports/crossmint-wallet-service.ts`

```typescript
export interface SwapQuoteParams {
  readonly inputMint: string;
  readonly outputMint: string;
  readonly amount: string;       // lamports
  readonly slippageBps: number;  // default 50
}

export interface SwapQuote {
  readonly inputAmount: string;
  readonly outputAmount: string;
  readonly priceImpactPct: number;
  readonly route: unknown;       // Jupiter route data
}

export interface ExecuteSwapParams {
  readonly walletAddress: string;
  readonly quoteResponse: SwapQuote;
}

export interface ICrossmintWalletService {
  createSmartWallet(chain: ChainType, ownerJwt: string): Promise<Result<Wallet, DomainError>>;
  getOrCreateWallets(chains: ChainType[], ownerJwt: string): Promise<Result<Wallet[], DomainError>>;
  getSwapQuote(params: SwapQuoteParams): Promise<Result<SwapQuote, DomainError>>;
  executeSwap(params: ExecuteSwapParams): Promise<Result<Transaction, DomainError>>;
}
```

### 2.3 Onboarding State

File: `src/domain/wallet/value-objects/onboarding-status.ts`

```typescript
export type OnboardingStep = 'wallet-setup' | 'wallet-success' | 'swap-intro' | 'profile-setup' | 'complete';

export interface OnboardingStatus {
  readonly isComplete: boolean;
  readonly currentStep: OnboardingStep;
  readonly walletsCreated: ChainType[];
}
```

## 3. Infrastructure Layer

### 3.1 Crossmint Adapter

File: `src/infrastructure/wallet/crossmint-adapter.ts`

Implements `ICrossmintWalletService`. Uses Crossmint's `useWallet()` hook internally (via a bridge pattern since adapters can't use hooks directly). The adapter:

- Calls `getOrCreateWallet()` per chain with the Supabase JWT
- Maps Crossmint wallet objects to domain `Wallet` entities
- Handles retry logic (3 attempts with exponential backoff)
- Reports errors as `DomainError` with specific codes

### 3.2 JWT Bridge

File: `src/infrastructure/wallet/crossmint-jwt-bridge.ts`

Retrieves the active Supabase JWT from SecureStore for Crossmint BYOA authentication.

### 3.3 Jupiter Client

File: `src/infrastructure/wallet/jupiter-client.ts`

HTTP client for Jupiter Lite API:
- `getQuote(params)` → `GET https://lite-api.jup.ag/swap/quote`
- `buildSwapTransaction(quoteResponse, userPublicKey)` → `POST https://lite-api.jup.ag/swap`

Key config: `maxAccounts=33` (required for multi-hop swaps within Solana tx limits).

## 4. Application Layer

### 4.1 Use Cases

| Use Case | File | Purpose |
|----------|------|---------|
| `CreateSmartWalletsUseCase` | `application/wallet/create-smart-wallets.use-case.ts` | Orchestrates parallel creation of EVM + Solana + Stellar wallets |
| `SwapTokensUseCase` | `application/trading/jupiter-swap.use-case.ts` | Quote → Build → Send Jupiter swap transaction |
| `CompleteOnboardingUseCase` | `application/wallet/complete-onboarding.use-case.ts` | Marks onboarding complete in SecureStore |

### 4.2 Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useCrossmintWallet` | `application/hooks/use-crossmint-wallet.ts` | Onboarding-specific hook wrapping wallet creation |
| `useOnboardingGate` | `application/hooks/use-onboarding-gate.ts` | Checks if user needs onboarding, redirects if so |
| `useJupiterSwap` | `application/hooks/use-jupiter-swap.ts` | Quote + execute swap with loading/error states |

### 4.3 Stores

| Store | File | Purpose |
|-------|------|---------|
| `useOnboardingStore` | `application/stores/onboarding-store.ts` | Tracks onboarding progress (step, wallets created, errors) |

## 5. Presentation Layer

### 5.1 Provider Wrapper

File: `src/presentation/providers/crossmint-provider.tsx`

Wraps Crossmint's `CrossmintProvider` + `CrossmintWalletProvider` with env-based configuration.

### 5.2 Provider Tree (Updated)

```tsx
<AppQueryProvider>
  <ThemeProvider>
    <NexCrossmintProvider>          {/* NEW */}
      <WalletConnectProvider>
        <AuthProvider>
          <Stack />
        </AuthProvider>
      </WalletConnectProvider>
    </NexCrossmintProvider>
  </ThemeProvider>
</AppQueryProvider>
```

### 5.3 Onboarding Routes

```
app/(app)/onboarding/
├── _layout.tsx            — Stack layout, back gesture disabled
├── wallet-setup.tsx       — Step 1: Animated wallet creation
├── wallet-success.tsx     — Step 2: Wallet cards with addresses
├── swap-intro.tsx         — Step 3: Jupiter swap introduction
└── profile-setup.tsx      — Step 4: Profile completion
```

### 5.4 Onboarding Screen Components

Reusable components in `src/presentation/components/wallet/onboarding/`:

| Component | Purpose |
|-----------|---------|
| `WalletCreationCard` | Per-chain creation progress (icon, name, status indicator) |
| `WalletAddressCard` | Displays created wallet address with copy button |
| `OnboardingProgress` | Step indicator dots/bar |
| `SwapPreview` | Jupiter swap quote preview card |

### 5.5 Wallet Export Screen

File: `app/(app)/settings/wallet-export.tsx`

Flow:
1. Biometric gate via `IBiometricService.authenticate()`
2. On success: render Crossmint's `<ExportPrivateKeyButton />`
3. On failure: navigate back with error toast

## 6. Environment & Security

### 6.1 Environment Variables

```env
# Crossmint (fixed naming — no hyphens)
EXPO_PUBLIC_CROSSMINT_CLIENT_KEY=ck_production_...
CROSSMINT_SERVER_API_KEY=sk_production_...    # server-only, never in client bundle
CROSSMINT_PROJECT_ID=a225edf4-...
```

### 6.2 Config Update

File: `src/config/env.ts`

Add Crossmint vars to the validated environment config:
```typescript
CROSSMINT_CLIENT_KEY: string;    // Required
CROSSMINT_PROJECT_ID: string;    // Required
```

### 6.3 Security Invariants

- CROSSMINT_SERVER_API_KEY never appears in client code
- EXPO_PUBLIC_CROSSMINT_CLIENT_KEY loaded via `getEnv()` only
- Wallet export gated by biometric authentication
- JWT tokens stored in SecureStore, never in MMKV
- Onboarding completion flag in SecureStore (tamper-resistant)

## 7. Crossmint Console Configuration (Manual)

Required one-time setup in Crossmint's production console:

1. **Auth provider**: Select "Supabase" or "Custom JWT"
2. **JWKS URL**: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
3. **Issuer**: Your Supabase project URL
4. **User ID claim**: `sub`
5. **API key scopes**: users.create, users.read, wallets.read, wallets.create, wallets:transactions.create, wallets:transactions.sign, wallets:balance.read, wallets.fund

## 8. AI SDK v6 Integration

### 8.1 Wallet Context for AI Agents

File: `src/application/agent/wallet-context.ts`

Builds a context string from the wallet store state and injects it into the AI agent's system prompt. The agent becomes aware of:
- Active wallet address and chain
- Token balances and total portfolio value
- Available swap capabilities (Jupiter on Solana)

### 8.2 New Package

Add `ai` (Vercel AI SDK v6) to dependencies. Integrate with existing chat/agent infrastructure.

## 9. Complete File Manifest

### New Files (18)

| File | Layer | LOC Est. |
|------|-------|----------|
| `domain/wallet/ports/crossmint-wallet-service.ts` | Domain | ~50 |
| `domain/wallet/value-objects/swap-params.ts` | Domain | ~40 |
| `domain/wallet/value-objects/onboarding-status.ts` | Domain | ~20 |
| `infrastructure/wallet/crossmint-adapter.ts` | Infra | ~200 |
| `infrastructure/wallet/crossmint-jwt-bridge.ts` | Infra | ~30 |
| `infrastructure/wallet/jupiter-client.ts` | Infra | ~100 |
| `application/wallet/create-smart-wallets.use-case.ts` | App | ~80 |
| `application/wallet/complete-onboarding.use-case.ts` | App | ~40 |
| `application/trading/jupiter-swap.use-case.ts` | App | ~80 |
| `application/hooks/use-crossmint-wallet.ts` | App | ~60 |
| `application/hooks/use-onboarding-gate.ts` | App | ~50 |
| `application/hooks/use-jupiter-swap.ts` | App | ~70 |
| `application/stores/onboarding-store.ts` | App | ~60 |
| `presentation/providers/crossmint-provider.tsx` | Pres | ~50 |
| `app/(app)/onboarding/_layout.tsx` | Route | ~30 |
| `app/(app)/onboarding/wallet-setup.tsx` | Route | ~200 |
| `app/(app)/onboarding/wallet-success.tsx` | Route | ~150 |
| `app/(app)/onboarding/swap-intro.tsx` | Route | ~120 |
| `app/(app)/onboarding/profile-setup.tsx` | Route | ~150 |
| `app/(app)/settings/wallet-export.tsx` | Route | ~80 |
| `application/agent/wallet-context.ts` | App | ~40 |
| `presentation/components/wallet/onboarding/` (4 components) | Pres | ~300 total |

### Modified Files (6)

| File | Change |
|------|--------|
| `domain/wallet/entities/wallet.ts` | Add `stellar`, `WalletProviderType`, `crossmintWalletId` |
| `application/container.ts` | Add `CrossmintWalletService` to ServiceKeys + ServiceMap |
| `presentation/providers/di-container.ts` | Register CrossmintWalletServiceAdapter |
| `presentation/providers/index.ts` | Export NexCrossmintProvider |
| `app/_layout.tsx` | Wrap with NexCrossmintProvider |
| `config/env.ts` | Add Crossmint env vars |
| `.env` | Fix hyphenated keys, add EXPO_PUBLIC_ prefix |

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Crossmint RN SDK bundle size | App size increase | Lazy-load via DI factory closures (existing pattern) |
| Stellar wallet support maturity | Limited docs | Verify with Crossmint's `StellarWallet` class before implementing |
| BYOA JWT validation failure | Wallet creation blocked | Fallback to email OTP signer if JWT fails |
| Jupiter API rate limits | Swap quotes fail | Client-side caching of quotes (30s TTL) |
| Export not supported for JWT signers | Feature limitation | Document and hide export button for JWT-based wallets |
