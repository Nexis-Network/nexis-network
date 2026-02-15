# Crossmint Smart Wallet Onboarding — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a post-auth onboarding flow that creates EVM, Solana, and Stellar smart wallets via Crossmint SDK, integrates Jupiter token swaps, and provides biometric-gated key export.

**Architecture:** Adapter Pattern — Crossmint SDK wrapped as an infrastructure adapter behind the existing `ICrossmintWalletService` domain port. Supabase JWT passed directly to Crossmint for BYOA. Provider tree extended with `CrossmintProvider` → `CrossmintWalletProvider`. Onboarding screens live under `app/(app)/onboarding/` as a mandatory post-auth gate.

**Tech Stack:** Expo 52, React Native 0.76, Crossmint React Native SDK (`@crossmint/client-sdk-react-native-ui`), Zustand 5, Zod, NativeWind 4, expo-secure-store, expo-local-authentication, vitest, Jupiter Lite API.

**Design Doc:** `docs/plans/2026-02-15-crossmint-wallet-onboarding-design.md`

---

## Phase 1: Environment & Configuration (Tasks 1–3)

### Task 1: Fix Environment Variables

**Files:**
- Modify: `mobile-expo-app/.env`

**Step 1: Fix the Crossmint env var names**

Replace the hyphenated keys with underscore versions and add the `EXPO_PUBLIC_` prefix for the client key:

```env
# Crossmint Credentials
CROSSMINT_PROJECT_ID=a225edf4-c988-4958-b7a6-42ee232de723
EXPO_PUBLIC_CROSSMINT_CLIENT_KEY=ck_production_9oC54LWVvneS56TQPhhtjoFcwVVMckdfd6hgQif9iWPJqDGtyir7weMz1zqAqjqzququzc8koBN6wJYtHBGC2cZZGDCZ2BmwTo5Ap3YmQVdF2sjnVEfxPHP8yp8LvX8gmzNbSUwspv1nafziPCyHeokBJHf9utpaoBTpqhzeo6s7e4ru3viweDCLx6HAKj4M76tR2H5wUSvBF3DNB8CGRebx
CROSSMINT_SERVER_API_KEY=sk_production_9oC54LWVvneS56TQPhhtjoFcwVVMckdfd6hgQif9iWPJqDGtyir9H8CiLasCot8X8zK9M7YjuwZPWnj85Lv8wAhh4Y4yVttQUVU5Bm18szYnnKDrBCiksoiT5kaHREvadcBEw38usd8fmJ9h9CdBWHBwMw9cP7x9pm9aM9TqeWoUMxFBnPLFpYRK5teJxF4MANMrKAtPBXufnRtZxGqa7JWZ
```

Remove the old hyphenated lines (`CROSSMINT_CLIENT-SIDE_API_KEY` and `CROSSMINT_SERVER-SIDE_API_KEY`).

**Step 2: Verify .gitignore includes .env**

Check that `mobile-expo-app/.gitignore` has `.env` and `.env.local` listed. If not, add them.

**Step 3: Commit**

```bash
git add mobile-expo-app/.env
git commit -m "fix(env): rename Crossmint keys to valid env var format

Hyphens in env var names break shell environments.
Renamed to underscore format with EXPO_PUBLIC_ prefix for client key."
```

---

### Task 2: Update Config Validation

**Files:**
- Modify: `mobile-expo-app/src/config/env.ts`
- Test: `mobile-expo-app/tests/config/env.test.ts`

**Step 1: Read the current env.ts to understand the validation pattern**

Read `src/config/env.ts` to see how existing env vars are validated and exported.

**Step 2: Write the failing test**

```typescript
// tests/config/env.test.ts — add to existing test file or create
import { describe, it, expect, vi } from 'vitest';

describe('env config - Crossmint', () => {
  it('should include CROSSMINT_CLIENT_KEY in validated env', () => {
    // Mock process.env
    vi.stubEnv('EXPO_PUBLIC_CROSSMINT_CLIENT_KEY', 'ck_test_abc123');
    vi.stubEnv('CROSSMINT_PROJECT_ID', 'test-project-id');

    // Re-import to pick up new env
    const { getEnv } = require('@config/env');
    const env = getEnv();

    expect(env.CROSSMINT_CLIENT_KEY).toBe('ck_test_abc123');
    expect(env.CROSSMINT_PROJECT_ID).toBe('test-project-id');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd mobile-expo-app && npx vitest run tests/config/env.test.ts -t "Crossmint"`
Expected: FAIL — `CROSSMINT_CLIENT_KEY` property doesn't exist on env type.

**Step 4: Add Crossmint vars to env.ts**

In the env config object and its type, add:

```typescript
CROSSMINT_CLIENT_KEY: process.env.EXPO_PUBLIC_CROSSMINT_CLIENT_KEY ?? '',
CROSSMINT_PROJECT_ID: process.env.CROSSMINT_PROJECT_ID ?? '',
```

Mark them as optional (empty string fallback) so the app doesn't crash without them.

**Step 5: Run test to verify it passes**

Run: `cd mobile-expo-app && npx vitest run tests/config/env.test.ts -t "Crossmint"`
Expected: PASS

**Step 6: Commit**

```bash
git add src/config/env.ts tests/config/env.test.ts
git commit -m "feat(config): add Crossmint env vars to validated config"
```

---

### Task 3: Install Crossmint SDK

**Files:**
- Modify: `mobile-expo-app/package.json`

**Step 1: Install the Crossmint React Native SDK**

```bash
cd mobile-expo-app && npm install @crossmint/client-sdk-react-native-ui
```

**Step 2: Verify installation**

```bash
cd mobile-expo-app && node -e "require('@crossmint/client-sdk-react-native-ui')" 2>&1 || echo "Package installed but needs RN runtime"
```

The package may need React Native runtime — that's expected. Just verify it's in `node_modules`.

**Step 3: Check for any required polyfills or metro config changes**

Read the Crossmint quickstart for any metro.config.js or babel.config.js changes needed. Apply if necessary.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): install @crossmint/client-sdk-react-native-ui"
```

---

## Phase 2: Domain Layer (Tasks 4–6)

### Task 4: Extend Wallet Entity

**Files:**
- Modify: `mobile-expo-app/src/domain/wallet/entities/wallet.ts`
- Test: `mobile-expo-app/tests/domain/wallet/entities/wallet.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/domain/wallet/entities/wallet.test.ts
import { describe, it, expect } from 'vitest';
import type { ChainType, WalletProviderType, Wallet } from '@domain/wallet/entities/wallet';

describe('Wallet entity types', () => {
  it('should accept stellar as a valid ChainType', () => {
    const chain: ChainType = 'stellar';
    expect(chain).toBe('stellar');
  });

  it('should accept crossmint as a valid WalletProviderType', () => {
    const provider: WalletProviderType = 'crossmint';
    expect(provider).toBe('crossmint');
  });

  it('should allow crossmintWalletId on Wallet', () => {
    const wallet: Wallet = {
      id: 'test-id' as any,
      address: '0x123',
      chainType: 'evm',
      label: 'Test EVM Wallet',
      isPrimary: true,
      safeVersion: undefined,
      deploymentStatus: 'running',
      walletProvider: 'crossmint',
      crossmintWalletId: 'cm-wallet-abc',
    };
    expect(wallet.crossmintWalletId).toBe('cm-wallet-abc');
    expect(wallet.walletProvider).toBe('crossmint');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd mobile-expo-app && npx vitest run tests/domain/wallet/entities/wallet.test.ts`
Expected: FAIL — `WalletProviderType` not exported, `walletProvider` not on `Wallet`.

**Step 3: Modify wallet.ts**

Add to `src/domain/wallet/entities/wallet.ts`:

```typescript
// After ChainType definition:
export type ChainType = 'evm' | 'solana' | 'sui' | 'stellar';

// NEW — add after DeploymentStatus:
export type WalletProviderType = 'crossmint' | 'walletconnect' | 'safe';

// Modify Wallet interface — add two new fields at the end:
export interface Wallet {
  readonly id: UUID;
  readonly address: string;
  readonly chainType: ChainType;
  readonly chainId?: number | undefined;
  readonly label: string;
  readonly isPrimary: boolean;
  readonly safeVersion: string | undefined;
  readonly deploymentStatus: DeploymentStatus;
  readonly walletProvider: WalletProviderType;
  readonly crossmintWalletId?: string | undefined;
}
```

**Step 4: Fix any type errors in existing code**

Adding `walletProvider` as required to `Wallet` will break existing code that creates `Wallet` objects without it. Search for all places that construct `Wallet` objects and add `walletProvider: 'walletconnect'` as the default:

- `src/infrastructure/wallet/wallet-manager.ts`
- `src/infrastructure/wallet/evm-adapter.ts`
- `src/infrastructure/wallet/solana-adapter.ts`
- `src/infrastructure/wallet/safe-adapter.ts`
- `src/infrastructure/api/wallet-api.ts`

For each, add `walletProvider: 'walletconnect'` (or `'safe'` for safe-adapter).

**Step 5: Run all tests**

Run: `cd mobile-expo-app && npx vitest run`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/domain/wallet/entities/wallet.ts src/infrastructure/wallet/ src/infrastructure/api/wallet-api.ts tests/
git commit -m "feat(domain): add stellar chain type, wallet provider discriminator, crossmint wallet ID"
```

---

### Task 5: Create Crossmint Wallet Service Port

**Files:**
- Create: `mobile-expo-app/src/domain/wallet/ports/crossmint-wallet-service.ts`

**Step 1: Create the domain port interface**

```typescript
// src/domain/wallet/ports/crossmint-wallet-service.ts

import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';
import type { ChainType, Wallet } from '@domain/wallet/entities/wallet';

// ---------------------------------------------------------------------------
// Swap types
// ---------------------------------------------------------------------------

export interface SwapQuoteParams {
  readonly inputMint: string;
  readonly outputMint: string;
  /** Amount in smallest unit (e.g. lamports for SOL). */
  readonly amount: string;
  /** Slippage tolerance in basis points. Default: 50. */
  readonly slippageBps: number;
}

export interface SwapQuote {
  readonly inputMint: string;
  readonly outputMint: string;
  readonly inputAmount: string;
  readonly outputAmount: string;
  readonly priceImpactPct: number;
  /** Opaque route data from Jupiter — passed directly to the build step. */
  readonly routeData: unknown;
}

export interface ExecuteSwapParams {
  readonly walletAddress: string;
  readonly quote: SwapQuote;
}

// ---------------------------------------------------------------------------
// Port interface
// ---------------------------------------------------------------------------

/**
 * Port for Crossmint smart wallet operations.
 *
 * This interface covers wallet lifecycle (creation, multi-chain provisioning),
 * token swaps (Jupiter on Solana), and key export. Infrastructure provides
 * the concrete adapter backed by the Crossmint React Native SDK.
 */
export interface ICrossmintWalletService {
  /**
   * Create a smart wallet on a single chain.
   * Uses the Supabase JWT for Bring Your Own Auth.
   */
  createSmartWallet(
    chain: ChainType,
    ownerJwt: string,
  ): Promise<Result<Wallet, DomainError>>;

  /**
   * Create smart wallets on multiple chains in parallel.
   * Returns all successfully created wallets. Failures per-chain are
   * reported in the error field if any chain fails.
   */
  getOrCreateWallets(
    chains: ReadonlyArray<ChainType>,
    ownerJwt: string,
  ): Promise<Result<ReadonlyArray<Wallet>, DomainError>>;

  /**
   * Fetch a swap quote from Jupiter (Solana only).
   */
  getSwapQuote(
    params: SwapQuoteParams,
  ): Promise<Result<SwapQuote, DomainError>>;

  /**
   * Execute a swap using a previously fetched quote.
   */
  executeSwap(
    params: ExecuteSwapParams,
  ): Promise<Result<string, DomainError>>;
}
```

**Step 2: Export from barrel files**

Add to `src/domain/wallet/index.ts`:
```typescript
export type { ICrossmintWalletService, SwapQuoteParams, SwapQuote, ExecuteSwapParams } from './ports/crossmint-wallet-service';
```

If `src/domain/wallet/ports/` doesn't have an index.ts, create one.

**Step 3: Commit**

```bash
git add src/domain/wallet/ports/ src/domain/wallet/index.ts
git commit -m "feat(domain): add ICrossmintWalletService port for smart wallet operations"
```

---

### Task 6: Create Onboarding Status Value Object

**Files:**
- Create: `mobile-expo-app/src/domain/wallet/value-objects/onboarding-status.ts`

**Step 1: Create the value object**

```typescript
// src/domain/wallet/value-objects/onboarding-status.ts

import type { ChainType } from '@domain/wallet/entities/wallet';

export type OnboardingStep =
  | 'wallet-setup'
  | 'wallet-success'
  | 'swap-intro'
  | 'profile-setup'
  | 'complete';

export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  'wallet-setup',
  'wallet-success',
  'swap-intro',
  'profile-setup',
  'complete',
] as const;

export interface OnboardingStatus {
  readonly isComplete: boolean;
  readonly currentStep: OnboardingStep;
  readonly walletsCreated: ReadonlyArray<ChainType>;
  readonly failedChains: ReadonlyArray<ChainType>;
}
```

**Step 2: Export from barrel**

Add to `src/domain/wallet/value-objects/index.ts`:
```typescript
export type { OnboardingStep, OnboardingStatus } from './onboarding-status';
export { ONBOARDING_STEPS } from './onboarding-status';
```

**Step 3: Commit**

```bash
git add src/domain/wallet/value-objects/
git commit -m "feat(domain): add OnboardingStatus value object and step definitions"
```

---

## Phase 3: Infrastructure Layer (Tasks 7–10)

### Task 7: Create Crossmint JWT Bridge

**Files:**
- Create: `mobile-expo-app/src/infrastructure/wallet/crossmint-jwt-bridge.ts`
- Test: `mobile-expo-app/tests/infrastructure/wallet/crossmint-jwt-bridge.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/infrastructure/wallet/crossmint-jwt-bridge.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';

describe('CrossmintJwtBridge', () => {
  it('should return the access token from secure storage', async () => {
    const mockStorage: ISecureStorage = {
      get: vi.fn().mockResolvedValue('jwt-token-abc'),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const { getCrossmintAuthJwt } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const result = await getCrossmintAuthJwt(mockStorage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('jwt-token-abc');
    }
  });

  it('should return failure when no token exists', async () => {
    const mockStorage: ISecureStorage = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      delete: vi.fn(),
    };

    const { getCrossmintAuthJwt } = await import(
      '@infrastructure/wallet/crossmint-jwt-bridge'
    );
    const result = await getCrossmintAuthJwt(mockStorage);

    expect(result.ok).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd mobile-expo-app && npx vitest run tests/infrastructure/wallet/crossmint-jwt-bridge.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the bridge**

```typescript
// src/infrastructure/wallet/crossmint-jwt-bridge.ts

import type { ISecureStorage } from '@domain/common/ports/secure-storage';
import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';
import { success, failure } from '@domain/common/types';
import { DomainError as DomainErrorClass } from '@domain/common/errors/domain-error';

const ACCESS_TOKEN_KEY = 'access_token';

/**
 * Retrieve the active Supabase JWT from SecureStore for Crossmint BYOA.
 *
 * The Supabase accessToken is a standard JWT that Crossmint validates
 * against the JWKS URL configured in the Crossmint Console.
 */
export async function getCrossmintAuthJwt(
  secureStorage: ISecureStorage,
): Promise<Result<string, DomainError>> {
  try {
    const token = await secureStorage.get(ACCESS_TOKEN_KEY);
    if (!token) {
      return failure(
        new DomainErrorClass(
          'No active session found. Please sign in first.',
          'AUTH_REQUIRED',
        ),
      );
    }
    return success(token);
  } catch (err) {
    return failure(
      new DomainErrorClass(
        `Failed to retrieve auth token: ${err instanceof Error ? err.message : String(err)}`,
        'STORAGE_ERROR',
      ),
    );
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd mobile-expo-app && npx vitest run tests/infrastructure/wallet/crossmint-jwt-bridge.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/wallet/crossmint-jwt-bridge.ts tests/infrastructure/wallet/
git commit -m "feat(infra): add Crossmint JWT bridge for Supabase BYOA"
```

---

### Task 8: Create Jupiter Client

**Files:**
- Create: `mobile-expo-app/src/infrastructure/wallet/jupiter-client.ts`
- Test: `mobile-expo-app/tests/infrastructure/wallet/jupiter-client.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/infrastructure/wallet/jupiter-client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('JupiterClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should fetch a swap quote', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        inAmount: '1000000000',
        outAmount: '42000000',
        priceImpactPct: '0.01',
      }),
    });

    const { JupiterClient } = await import(
      '@infrastructure/wallet/jupiter-client'
    );
    const client = new JupiterClient();
    const result = await client.getQuote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: '1000000000',
      slippageBps: 50,
    });

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('lite-api.jup.ag/swap/quote'),
      expect.any(Object),
    );
  });

  it('should build a swap transaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        swapTransaction: 'base64-encoded-transaction',
      }),
    });

    const { JupiterClient } = await import(
      '@infrastructure/wallet/jupiter-client'
    );
    const client = new JupiterClient();
    const result = await client.buildSwapTransaction(
      { routeData: { some: 'quote' } } as any,
      'userPublicKey123',
    );

    expect(result.ok).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd mobile-expo-app && npx vitest run tests/infrastructure/wallet/jupiter-client.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement Jupiter client**

```typescript
// src/infrastructure/wallet/jupiter-client.ts

import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';
import type { SwapQuote, SwapQuoteParams } from '@domain/wallet/ports/crossmint-wallet-service';
import { success, failure } from '@domain/common/types';
import { DomainError as DomainErrorClass } from '@domain/common/errors/domain-error';

const JUPITER_LITE_API = 'https://lite-api.jup.ag/swap';
const MAX_ACCOUNTS = 33;

export class JupiterClient {
  async getQuote(
    params: SwapQuoteParams,
  ): Promise<Result<SwapQuote, DomainError>> {
    try {
      const url = new URL(`${JUPITER_LITE_API}/quote`);
      url.searchParams.set('inputMint', params.inputMint);
      url.searchParams.set('outputMint', params.outputMint);
      url.searchParams.set('amount', params.amount);
      url.searchParams.set('slippageBps', String(params.slippageBps));
      url.searchParams.set('maxAccounts', String(MAX_ACCOUNTS));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return failure(
          new DomainErrorClass(
            `Jupiter quote failed: ${response.status} ${response.statusText}`,
            'SWAP_QUOTE_FAILED',
          ),
        );
      }

      const data = await response.json();

      return success({
        inputMint: data.inputMint,
        outputMint: data.outputMint,
        inputAmount: data.inAmount,
        outputAmount: data.outAmount,
        priceImpactPct: parseFloat(data.priceImpactPct ?? '0'),
        routeData: data,
      });
    } catch (err) {
      return failure(
        new DomainErrorClass(
          `Jupiter quote error: ${err instanceof Error ? err.message : String(err)}`,
          'SWAP_NETWORK_ERROR',
        ),
      );
    }
  }

  async buildSwapTransaction(
    quote: SwapQuote,
    userPublicKey: string,
  ): Promise<Result<string, DomainError>> {
    try {
      const response = await fetch(JUPITER_LITE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote.routeData,
          userPublicKey,
        }),
      });

      if (!response.ok) {
        return failure(
          new DomainErrorClass(
            `Jupiter build failed: ${response.status}`,
            'SWAP_BUILD_FAILED',
          ),
        );
      }

      const data = await response.json();
      return success(data.swapTransaction);
    } catch (err) {
      return failure(
        new DomainErrorClass(
          `Jupiter build error: ${err instanceof Error ? err.message : String(err)}`,
          'SWAP_NETWORK_ERROR',
        ),
      );
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd mobile-expo-app && npx vitest run tests/infrastructure/wallet/jupiter-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/wallet/jupiter-client.ts tests/infrastructure/wallet/jupiter-client.test.ts
git commit -m "feat(infra): add Jupiter Lite API client for Solana token swaps"
```

---

### Task 9: Create Crossmint Wallet Adapter

**Files:**
- Create: `mobile-expo-app/src/infrastructure/wallet/crossmint-adapter.ts`
- Test: `mobile-expo-app/tests/infrastructure/wallet/crossmint-adapter.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/infrastructure/wallet/crossmint-adapter.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('CrossmintWalletServiceAdapter', () => {
  it('should map Crossmint wallet response to domain Wallet', () => {
    const { mapCrossmintWalletToDomain } = require(
      '@infrastructure/wallet/crossmint-adapter'
    );

    const crossmintWallet = {
      address: '0xABC123',
      chain: 'base',
    };

    const result = mapCrossmintWalletToDomain(crossmintWallet, 'evm', 'cm-id-123');

    expect(result.address).toBe('0xABC123');
    expect(result.chainType).toBe('evm');
    expect(result.walletProvider).toBe('crossmint');
    expect(result.crossmintWalletId).toBe('cm-id-123');
    expect(result.deploymentStatus).toBe('running');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd mobile-expo-app && npx vitest run tests/infrastructure/wallet/crossmint-adapter.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the adapter**

```typescript
// src/infrastructure/wallet/crossmint-adapter.ts

import { v4 as uuidv4 } from 'react-native-get-random-values';
import type { Result } from '@domain/common/types';
import type { DomainError } from '@domain/common/errors/domain-error';
import type { ChainType, Wallet } from '@domain/wallet/entities/wallet';
import type {
  ICrossmintWalletService,
  SwapQuote,
  SwapQuoteParams,
  ExecuteSwapParams,
} from '@domain/wallet/ports/crossmint-wallet-service';
import { success, failure } from '@domain/common/types';
import { DomainError as DomainErrorClass } from '@domain/common/errors/domain-error';
import { JupiterClient } from './jupiter-client';

// ---------------------------------------------------------------------------
// Chain mapping: domain ChainType → Crossmint chain identifier
// ---------------------------------------------------------------------------

const CHAIN_MAP: Record<ChainType, string> = {
  evm: 'base',
  solana: 'solana',
  stellar: 'stellar',
  sui: 'sui',
};

const CHAIN_LABELS: Record<ChainType, string> = {
  evm: 'Ethereum (Base)',
  solana: 'Solana',
  stellar: 'Stellar',
  sui: 'Sui',
};

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

export function mapCrossmintWalletToDomain(
  crossmintWallet: { address: string; chain?: string },
  chainType: ChainType,
  crossmintWalletId: string,
): Wallet {
  return {
    id: uuidv4() as any,
    address: crossmintWallet.address,
    chainType,
    chainId: chainType === 'evm' ? 8453 : undefined, // Base chain ID
    label: CHAIN_LABELS[chainType] ?? chainType,
    isPrimary: chainType === 'evm',
    safeVersion: undefined,
    deploymentStatus: 'running',
    walletProvider: 'crossmint',
    crossmintWalletId,
  };
}

// ---------------------------------------------------------------------------
// Service adapter
//
// NOTE: This adapter is designed to be used in conjunction with Crossmint's
// React hooks (useWallet). The actual SDK calls happen in the
// `useCrossmintWallet` hook which bridges React hooks to this service.
// This class handles non-hook operations (mapping, Jupiter swaps).
// ---------------------------------------------------------------------------

export class CrossmintWalletServiceAdapter implements ICrossmintWalletService {
  private readonly jupiter = new JupiterClient();

  async createSmartWallet(
    _chain: ChainType,
    _ownerJwt: string,
  ): Promise<Result<Wallet, DomainError>> {
    // Wallet creation is handled by the Crossmint React hook (useWallet)
    // in the presentation layer. This method exists for the interface
    // contract but the actual creation flow is hook-driven.
    return failure(
      new DomainErrorClass(
        'Use useCrossmintWallet hook for wallet creation',
        'USE_HOOK_INSTEAD',
      ),
    );
  }

  async getOrCreateWallets(
    _chains: ReadonlyArray<ChainType>,
    _ownerJwt: string,
  ): Promise<Result<ReadonlyArray<Wallet>, DomainError>> {
    // Same as above — hook-driven creation
    return failure(
      new DomainErrorClass(
        'Use useCrossmintWallet hook for wallet creation',
        'USE_HOOK_INSTEAD',
      ),
    );
  }

  async getSwapQuote(
    params: SwapQuoteParams,
  ): Promise<Result<SwapQuote, DomainError>> {
    return this.jupiter.getQuote(params);
  }

  async executeSwap(
    _params: ExecuteSwapParams,
  ): Promise<Result<string, DomainError>> {
    // Swap execution requires the Crossmint SolanaWallet instance
    // which comes from the useWallet hook. The actual execution is
    // coordinated in the useJupiterSwap hook.
    return failure(
      new DomainErrorClass(
        'Use useJupiterSwap hook for swap execution',
        'USE_HOOK_INSTEAD',
      ),
    );
  }
}

export { CHAIN_MAP, CHAIN_LABELS };
```

**Step 4: Run test to verify it passes**

Run: `cd mobile-expo-app && npx vitest run tests/infrastructure/wallet/crossmint-adapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/wallet/crossmint-adapter.ts tests/infrastructure/wallet/
git commit -m "feat(infra): add Crossmint wallet adapter with domain mapping and Jupiter integration"
```

---

### Task 10: Register Crossmint Service in DI Container

**Files:**
- Modify: `mobile-expo-app/src/application/container.ts`
- Modify: `mobile-expo-app/src/presentation/providers/di-container.ts`

**Step 1: Add CrossmintWalletService to ServiceKeys**

In `src/application/container.ts`, add to the ServiceKeys object and ServiceMap:

```typescript
// Add symbol declaration
declare const _CrossmintWalletService: unique symbol;

// Add to ServiceKeys:
CrossmintWalletService: Symbol.for('CrossmintWalletService') as typeof _CrossmintWalletService,

// Add to ServiceMap:
readonly [ServiceKeys.CrossmintWalletService]: ICrossmintWalletService;
```

Don't forget to add the import for `ICrossmintWalletService`.

**Step 2: Register in DI initialization**

In `src/presentation/providers/di-container.ts`, add:

```typescript
container.register(ServiceKeys.CrossmintWalletService, () => {
  const { CrossmintWalletServiceAdapter } = require(
    '@infrastructure/wallet/crossmint-adapter'
  ) as {
    CrossmintWalletServiceAdapter: new () => import('@domain/wallet/ports/crossmint-wallet-service').ICrossmintWalletService;
  };
  return new CrossmintWalletServiceAdapter();
});
```

**Step 3: Verify type-check passes**

Run: `cd mobile-expo-app && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/application/container.ts src/presentation/providers/di-container.ts
git commit -m "feat(di): register CrossmintWalletService in DI container"
```

---

## Phase 4: Application Layer (Tasks 11–15)

### Task 11: Create Onboarding Store

**Files:**
- Create: `mobile-expo-app/src/application/stores/onboarding-store.ts`
- Test: `mobile-expo-app/tests/application/stores/onboarding-store.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/application/stores/onboarding-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from '@application/stores/onboarding-store';

describe('onboarding-store', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('should start with wallet-setup step', () => {
    const state = useOnboardingStore.getState();
    expect(state.currentStep).toBe('wallet-setup');
    expect(state.isComplete).toBe(false);
    expect(state.walletsCreated).toEqual([]);
  });

  it('should track wallet creation per chain', () => {
    const store = useOnboardingStore.getState();
    store.markWalletCreated('evm');
    store.markWalletCreated('solana');

    const updated = useOnboardingStore.getState();
    expect(updated.walletsCreated).toContain('evm');
    expect(updated.walletsCreated).toContain('solana');
  });

  it('should advance to next step', () => {
    useOnboardingStore.getState().nextStep();
    expect(useOnboardingStore.getState().currentStep).toBe('wallet-success');
  });

  it('should mark complete on final step', () => {
    const store = useOnboardingStore.getState();
    store.nextStep(); // wallet-success
    store.nextStep(); // swap-intro
    store.nextStep(); // profile-setup
    store.nextStep(); // complete

    expect(useOnboardingStore.getState().isComplete).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd mobile-expo-app && npx vitest run tests/application/stores/onboarding-store.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the store**

```typescript
// src/application/stores/onboarding-store.ts

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ChainType } from '@domain/wallet/entities/wallet';
import type { OnboardingStep } from '@domain/wallet/value-objects/onboarding-status';
import { ONBOARDING_STEPS } from '@domain/wallet/value-objects/onboarding-status';

interface OnboardingState {
  currentStep: OnboardingStep;
  isComplete: boolean;
  walletsCreated: ChainType[];
  failedChains: ChainType[];
  isCreating: boolean;
  error: string | null;
}

interface OnboardingActions {
  nextStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  markWalletCreated: (chain: ChainType) => void;
  markWalletFailed: (chain: ChainType) => void;
  setCreating: (creating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

const initialState: OnboardingState = {
  currentStep: 'wallet-setup',
  isComplete: false,
  walletsCreated: [],
  failedChains: [],
  isCreating: false,
  error: null,
};

export const useOnboardingStore = create<OnboardingStore>()(
  immer<OnboardingStore>((set) => ({
    ...initialState,

    nextStep: () =>
      set((state) => {
        const idx = ONBOARDING_STEPS.indexOf(state.currentStep);
        const next = ONBOARDING_STEPS[idx + 1];
        if (next) {
          state.currentStep = next;
          if (next === 'complete') {
            state.isComplete = true;
          }
        }
      }),

    goToStep: (step) =>
      set((state) => {
        state.currentStep = step;
        state.isComplete = step === 'complete';
      }),

    markWalletCreated: (chain) =>
      set((state) => {
        if (!state.walletsCreated.includes(chain)) {
          state.walletsCreated.push(chain);
        }
        // Remove from failed if it was retried successfully
        state.failedChains = state.failedChains.filter((c) => c !== chain);
      }),

    markWalletFailed: (chain) =>
      set((state) => {
        if (!state.failedChains.includes(chain)) {
          state.failedChains.push(chain);
        }
      }),

    setCreating: (creating) =>
      set((state) => {
        state.isCreating = creating;
        if (creating) state.error = null;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
        state.isCreating = false;
      }),

    reset: () => set(() => ({ ...initialState })),
  })),
);
```

**Step 4: Run test to verify it passes**

Run: `cd mobile-expo-app && npx vitest run tests/application/stores/onboarding-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/application/stores/onboarding-store.ts tests/application/stores/
git commit -m "feat(store): add onboarding Zustand store with step tracking"
```

---

### Task 12: Create useCrossmintWallet Hook

**Files:**
- Create: `mobile-expo-app/src/application/hooks/use-crossmint-wallet.ts`

**Step 1: Implement the hook**

This hook bridges Crossmint's `useWallet` React hook with the onboarding store and wallet store. It orchestrates multi-chain wallet creation.

```typescript
// src/application/hooks/use-crossmint-wallet.ts

import { useCallback, useMemo } from 'react';
import { useWallet } from '@crossmint/client-sdk-react-native-ui';

import type { ChainType, Wallet } from '@domain/wallet/entities/wallet';
import { useOnboardingStore } from '@application/stores/onboarding-store';
import { useWalletStore } from '@application/stores/wallet-store';
import { useAuthStore } from '@application/stores/auth-store';
import { mapCrossmintWalletToDomain, CHAIN_MAP } from '@infrastructure/wallet/crossmint-adapter';

const TARGET_CHAINS: ReadonlyArray<ChainType> = ['evm', 'solana', 'stellar'];

export interface UseCrossmintWalletReturn {
  /** Create wallets on all target chains. */
  createAllWallets: () => Promise<void>;
  /** Retry creation for a specific failed chain. */
  retryChain: (chain: ChainType) => Promise<void>;
  /** Whether wallet creation is in progress. */
  isCreating: boolean;
  /** Chains that have been successfully created. */
  walletsCreated: ReadonlyArray<ChainType>;
  /** Chains that failed to create. */
  failedChains: ReadonlyArray<ChainType>;
  /** Error message if creation failed. */
  error: string | null;
}

export function useCrossmintWallet(): UseCrossmintWalletReturn {
  const { getOrCreateWallet, status } = useWallet();
  const session = useAuthStore((s) => s.session);

  const isCreating = useOnboardingStore((s) => s.isCreating);
  const walletsCreated = useOnboardingStore((s) => s.walletsCreated);
  const failedChains = useOnboardingStore((s) => s.failedChains);
  const error = useOnboardingStore((s) => s.error);
  const setCreating = useOnboardingStore((s) => s.setCreating);
  const setError = useOnboardingStore((s) => s.setError);
  const markWalletCreated = useOnboardingStore((s) => s.markWalletCreated);
  const markWalletFailed = useOnboardingStore((s) => s.markWalletFailed);

  const addWallet = useWalletStore((s) => s.addWallet);

  const createWalletForChain = useCallback(
    async (chain: ChainType): Promise<void> => {
      const crossmintChain = CHAIN_MAP[chain];
      if (!crossmintChain) {
        markWalletFailed(chain);
        return;
      }

      try {
        const cmWallet = await getOrCreateWallet({
          chain: crossmintChain,
          signer: { type: 'email' },
        });

        if (cmWallet?.address) {
          const domainWallet = mapCrossmintWalletToDomain(
            cmWallet,
            chain,
            cmWallet.address, // Use address as crossmint ID
          );
          addWallet(domainWallet);
          markWalletCreated(chain);
        } else {
          markWalletFailed(chain);
        }
      } catch (err) {
        markWalletFailed(chain);
      }
    },
    [getOrCreateWallet, addWallet, markWalletCreated, markWalletFailed],
  );

  const createAllWallets = useCallback(async () => {
    setCreating(true);
    setError(null);

    const results = await Promise.allSettled(
      TARGET_CHAINS.map((chain) => createWalletForChain(chain)),
    );

    const anyFailed = results.some((r) => r.status === 'rejected');
    const state = useOnboardingStore.getState();

    if (state.failedChains.length > 0) {
      setError(
        `Failed to create wallets on: ${state.failedChains.join(', ')}. You can retry.`,
      );
    }

    setCreating(false);
  }, [createWalletForChain, setCreating, setError]);

  const retryChain = useCallback(
    async (chain: ChainType) => {
      setCreating(true);
      await createWalletForChain(chain);
      setCreating(false);
    },
    [createWalletForChain, setCreating],
  );

  return {
    createAllWallets,
    retryChain,
    isCreating,
    walletsCreated,
    failedChains,
    error,
  };
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-crossmint-wallet.ts
git commit -m "feat(hooks): add useCrossmintWallet hook for multi-chain wallet creation"
```

---

### Task 13: Create useOnboardingGate Hook

**Files:**
- Create: `mobile-expo-app/src/application/hooks/use-onboarding-gate.ts`

**Step 1: Implement the gate hook**

```typescript
// src/application/hooks/use-onboarding-gate.ts

import { useEffect, useState, useMemo } from 'react';
import { router } from 'expo-router';

import { container, ServiceKeys } from '@application/container';
import type { ISecureStorage } from '@domain/common/ports/secure-storage';
import { useAuthStore } from '@application/stores/auth-store';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

export interface UseOnboardingGateReturn {
  /** Whether the onboarding check is still loading. */
  isChecking: boolean;
  /** Whether the user has completed onboarding. */
  isOnboarded: boolean;
}

/**
 * Checks whether the authenticated user has completed wallet onboarding.
 * If not, redirects to the onboarding flow.
 *
 * Place this hook in the main (tabs) layout to gate access.
 */
export function useOnboardingGate(): UseOnboardingGateReturn {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isChecking, setIsChecking] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const secureStorage = useMemo(
    () => container.resolve<ISecureStorage>(ServiceKeys.SecureStorage),
    [],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const value = await secureStorage.get(ONBOARDING_COMPLETE_KEY);
        if (cancelled) return;

        if (value === 'true') {
          setIsOnboarded(true);
        } else {
          // Redirect to onboarding
          router.replace('/(app)/onboarding/wallet-setup');
        }
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }

    void check();
    return () => { cancelled = true; };
  }, [isAuthenticated, secureStorage]);

  return { isChecking, isOnboarded };
}

/**
 * Mark onboarding as complete. Call after the final onboarding step.
 */
export async function markOnboardingComplete(): Promise<void> {
  const secureStorage = container.resolve<ISecureStorage>(ServiceKeys.SecureStorage);
  await secureStorage.set(ONBOARDING_COMPLETE_KEY, 'true');
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-onboarding-gate.ts
git commit -m "feat(hooks): add useOnboardingGate hook for mandatory wallet onboarding"
```

---

### Task 14: Create useJupiterSwap Hook

**Files:**
- Create: `mobile-expo-app/src/application/hooks/use-jupiter-swap.ts`

**Step 1: Implement the swap hook**

```typescript
// src/application/hooks/use-jupiter-swap.ts

import { useCallback, useMemo, useState } from 'react';

import { container, ServiceKeys } from '@application/container';
import type { ICrossmintWalletService, SwapQuote, SwapQuoteParams } from '@domain/wallet/ports/crossmint-wallet-service';

export interface UseJupiterSwapReturn {
  /** Fetch a swap quote. */
  getQuote: (params: SwapQuoteParams) => Promise<void>;
  /** Execute the current quote. */
  executeSwap: (walletAddress: string) => Promise<void>;
  /** The current swap quote. */
  quote: SwapQuote | null;
  /** Whether a quote or swap is in progress. */
  isLoading: boolean;
  /** Error message. */
  error: string | null;
  /** Clear the current quote and error. */
  reset: () => void;
}

export function useJupiterSwap(): UseJupiterSwapReturn {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crossmintService = useMemo(
    () => container.resolve<ICrossmintWalletService>(ServiceKeys.CrossmintWalletService),
    [],
  );

  const getQuote = useCallback(
    async (params: SwapQuoteParams) => {
      setIsLoading(true);
      setError(null);
      setQuote(null);

      const result = await crossmintService.getSwapQuote(params);

      if (result.ok) {
        setQuote(result.value);
      } else {
        setError(result.error.message);
      }

      setIsLoading(false);
    },
    [crossmintService],
  );

  const executeSwap = useCallback(
    async (walletAddress: string) => {
      if (!quote) {
        setError('No quote available. Fetch a quote first.');
        return;
      }

      setIsLoading(true);
      setError(null);

      const result = await crossmintService.executeSwap({
        walletAddress,
        quote,
      });

      if (!result.ok) {
        setError(result.error.message);
      }

      setIsLoading(false);
    },
    [crossmintService, quote],
  );

  const reset = useCallback(() => {
    setQuote(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { getQuote, executeSwap, quote, isLoading, error, reset };
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-jupiter-swap.ts
git commit -m "feat(hooks): add useJupiterSwap hook for Jupiter token swap quotes and execution"
```

---

### Task 15: Create AI Wallet Context

**Files:**
- Create: `mobile-expo-app/src/application/agent/wallet-context.ts`

**Step 1: Implement wallet context builder**

```typescript
// src/application/agent/wallet-context.ts

import type { Wallet, TokenBalance } from '@domain/wallet/entities/wallet';

/**
 * Build a context string describing the user's wallet state
 * for injection into AI agent system prompts.
 */
export function buildWalletContext(
  activeWallet: Wallet | null,
  portfolio: ReadonlyArray<TokenBalance>,
  totalValue: number,
): string {
  if (!activeWallet) {
    return 'The user has no active wallet connected.';
  }

  const tokenSummary = portfolio
    .filter((t) => parseFloat(t.balance) > 0)
    .map((t) => `${t.symbol}: ${t.balance}${t.usdValue != null ? ` ($${t.usdValue.toFixed(2)})` : ''}`)
    .join(', ');

  return [
    `Active wallet: ${activeWallet.address}`,
    `Chain: ${activeWallet.chainType}${activeWallet.chainId ? ` (chain ID: ${activeWallet.chainId})` : ''}`,
    `Wallet type: ${activeWallet.walletProvider} smart wallet`,
    `Total portfolio value: $${totalValue.toFixed(2)}`,
    tokenSummary ? `Token balances: ${tokenSummary}` : 'No token balances available.',
    activeWallet.chainType === 'solana' ? 'Jupiter swaps available on Solana.' : '',
  ]
    .filter(Boolean)
    .join('\n');
}
```

**Step 2: Commit**

```bash
git add src/application/agent/wallet-context.ts
git commit -m "feat(agent): add wallet context builder for AI agent awareness"
```

---

## Phase 5: Presentation Layer — Providers (Task 16)

### Task 16: Create Crossmint Provider Wrapper

**Files:**
- Create: `mobile-expo-app/src/presentation/providers/crossmint-provider.tsx`
- Modify: `mobile-expo-app/src/presentation/providers/index.ts`
- Modify: `mobile-expo-app/app/_layout.tsx`

**Step 1: Create the provider component**

```tsx
// src/presentation/providers/crossmint-provider.tsx

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
```

**Step 2: Export from providers barrel**

Add to `src/presentation/providers/index.ts`:
```typescript
export { NexCrossmintProvider } from './crossmint-provider';
```

**Step 3: Update root layout**

In `app/_layout.tsx`, add `NexCrossmintProvider` to the provider tree after `ThemeProvider` and before `WalletConnectProvider`:

```tsx
import {
  AppQueryProvider,
  AuthProvider,
  ThemeProvider,
  WalletConnectProvider,
  NexCrossmintProvider,
  initializeDI,
} from '@presentation/providers';

// In the return:
<AppQueryProvider>
  <ThemeProvider>
    <NexCrossmintProvider>
      <WalletConnectProvider>
        <AuthProvider>
          <StatusBar style="light" backgroundColor="#141414" />
          <Stack ... />
        </AuthProvider>
      </WalletConnectProvider>
    </NexCrossmintProvider>
  </ThemeProvider>
</AppQueryProvider>
```

**Step 4: Type-check**

Run: `cd mobile-expo-app && npx tsc --noEmit`
Expected: No errors (or only pre-existing ones)

**Step 5: Commit**

```bash
git add src/presentation/providers/crossmint-provider.tsx src/presentation/providers/index.ts app/_layout.tsx
git commit -m "feat(providers): add NexCrossmintProvider wrapper and integrate into root layout"
```

---

## Phase 6: Onboarding Screens (Tasks 17–21)

### Task 17: Onboarding Layout

**Files:**
- Create: `mobile-expo-app/app/(app)/onboarding/_layout.tsx`

**Step 1: Create the layout**

```tsx
// app/(app)/onboarding/_layout.tsx

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
```

**Step 2: Commit**

```bash
git add app/\(app\)/onboarding/_layout.tsx
git commit -m "feat(onboarding): add onboarding stack layout with disabled back gesture"
```

---

### Task 18: Wallet Setup Screen (Step 1)

**Files:**
- Create: `mobile-expo-app/app/(app)/onboarding/wallet-setup.tsx`
- Create: `mobile-expo-app/src/presentation/components/wallet/onboarding/wallet-creation-card.tsx`

**Step 1: Create the WalletCreationCard component**

```tsx
// src/presentation/components/wallet/onboarding/wallet-creation-card.tsx

import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@presentation/components/ui/text';

type CreationStatus = 'pending' | 'creating' | 'success' | 'error';

interface WalletCreationCardProps {
  readonly chainName: string;
  readonly chainIcon: React.ReactNode;
  readonly status: CreationStatus;
  readonly index: number;
  readonly onRetry?: () => void;
}

const STATUS_COLORS: Record<CreationStatus, string> = {
  pending: 'bg-surface-secondary',
  creating: 'bg-brand/20',
  success: 'bg-success/20',
  error: 'bg-destructive/20',
};

const STATUS_TEXT: Record<CreationStatus, string> = {
  pending: 'Waiting...',
  creating: 'Creating...',
  success: 'Created',
  error: 'Failed',
};

export function WalletCreationCard({
  chainName,
  chainIcon,
  status,
  index,
  onRetry,
}: WalletCreationCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 150).duration(400)}>
      <View
        className={`flex-row items-center p-4 rounded-2xl mb-3 border border-border ${STATUS_COLORS[status]}`}
      >
        <View className="w-12 h-12 rounded-xl bg-surface items-center justify-center mr-4">
          {chainIcon}
        </View>
        <View className="flex-1">
          <Text variant="body" className="font-semibold text-white">
            {chainName}
          </Text>
          <Text variant="caption" color="secondary">
            {STATUS_TEXT[status]}
          </Text>
        </View>
        {status === 'error' && onRetry && (
          <View className="px-3 py-1.5 rounded-lg bg-brand/20">
            <Text
              variant="caption"
              className="text-brand font-medium"
              onPress={onRetry}
            >
              Retry
            </Text>
          </View>
        )}
        {status === 'success' && (
          <View className="w-6 h-6 rounded-full bg-success items-center justify-center">
            <Text variant="caption" className="text-white text-xs">
              ✓
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
```

**Step 2: Create the Wallet Setup screen**

```tsx
// app/(app)/onboarding/wallet-setup.tsx

import { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Wallet, Globe, Sun } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { WalletCreationCard } from '@presentation/components/wallet/onboarding/wallet-creation-card';
import { useCrossmintWallet } from '@application/hooks/use-crossmint-wallet';
import type { ChainType } from '@domain/wallet/entities/wallet';

const CHAINS: Array<{ chain: ChainType; name: string; icon: React.ReactNode }> = [
  { chain: 'evm', name: 'Ethereum (Base)', icon: <Wallet size={24} color="#627EEA" /> },
  { chain: 'solana', name: 'Solana', icon: <Globe size={24} color="#9945FF" /> },
  { chain: 'stellar', name: 'Stellar', icon: <Sun size={24} color="#00B4E6" /> },
];

export default function WalletSetupScreen() {
  const {
    createAllWallets,
    retryChain,
    isCreating,
    walletsCreated,
    failedChains,
    error,
  } = useCrossmintWallet();

  const hasStarted = useRef(false);

  // Auto-start wallet creation on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      void createAllWallets();
    }
  }, [createAllWallets]);

  const allComplete = walletsCreated.length === CHAINS.length;
  const hasErrors = failedChains.length > 0;

  const getStatus = useCallback(
    (chain: ChainType) => {
      if (walletsCreated.includes(chain)) return 'success' as const;
      if (failedChains.includes(chain)) return 'error' as const;
      if (isCreating) return 'creating' as const;
      return 'pending' as const;
    },
    [walletsCreated, failedChains, isCreating],
  );

  const handleContinue = useCallback(() => {
    router.push('/(app)/onboarding/wallet-success');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12">
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)}>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-2">
            Creating Your Wallets
          </Text>
          <Text variant="body" color="secondary" className="text-center mb-8">
            Setting up smart wallets across three chains
          </Text>
        </Animated.View>

        {/* Chain cards */}
        <View className="mb-8">
          {CHAINS.map((item, index) => (
            <WalletCreationCard
              key={item.chain}
              chainName={item.name}
              chainIcon={item.icon}
              status={getStatus(item.chain)}
              index={index}
              onRetry={
                failedChains.includes(item.chain)
                  ? () => void retryChain(item.chain)
                  : undefined
              }
            />
          ))}
        </View>

        {/* Loading indicator */}
        {isCreating && (
          <Animated.View entering={FadeInUp.duration(300)} className="items-center mb-4">
            <ActivityIndicator color="#38bdf8" size="small" />
            <Text variant="caption" color="secondary" className="mt-2">
              This may take a moment...
            </Text>
          </Animated.View>
        )}

        {/* Error message */}
        {error && !isCreating && (
          <View className="bg-destructive/10 rounded-xl p-4 mb-4">
            <Text variant="caption" className="text-destructive text-center">
              {error}
            </Text>
          </View>
        )}

        {/* Spacer */}
        <View className="flex-1" />

        {/* Continue button */}
        {(allComplete || (hasErrors && !isCreating && walletsCreated.length > 0)) && (
          <Animated.View entering={FadeInUp.duration(400)}>
            <Button variant="brand" size="lg" fullWidth onPress={handleContinue}>
              {allComplete ? 'Continue' : 'Continue with available wallets'}
            </Button>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add app/\(app\)/onboarding/wallet-setup.tsx src/presentation/components/wallet/onboarding/
git commit -m "feat(onboarding): add wallet setup screen with multi-chain creation progress"
```

---

### Task 19: Wallet Success Screen (Step 2)

**Files:**
- Create: `mobile-expo-app/app/(app)/onboarding/wallet-success.tsx`
- Create: `mobile-expo-app/src/presentation/components/wallet/onboarding/wallet-address-card.tsx`

**Step 1: Create WalletAddressCard component**

```tsx
// src/presentation/components/wallet/onboarding/wallet-address-card.tsx

import { useCallback } from 'react';
import { View, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Copy } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import type { Wallet } from '@domain/wallet/entities/wallet';

interface WalletAddressCardProps {
  readonly wallet: Wallet;
  readonly index: number;
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletAddressCard({ wallet, index }: WalletAddressCardProps) {
  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(wallet.address);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [wallet.address]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <View className="bg-surface rounded-2xl p-4 mb-3 border border-border">
        <View className="flex-row items-center justify-between mb-2">
          <Text variant="caption" color="secondary" className="font-medium uppercase text-xs">
            {wallet.label}
          </Text>
          <View className="px-2 py-0.5 rounded bg-brand/20">
            <Text variant="caption" className="text-brand text-xs">
              {wallet.chainType.toUpperCase()}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleCopy}
          className="flex-row items-center"
          hitSlop={8}
        >
          <Text variant="body" className="text-white font-mono flex-1">
            {truncateAddress(wallet.address)}
          </Text>
          <Copy size={16} color="#8B8B8B" />
        </Pressable>
      </View>
    </Animated.View>
  );
}
```

**Step 2: Create the Success screen**

```tsx
// app/(app)/onboarding/wallet-success.tsx

import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp, BounceIn } from 'react-native-reanimated';
import { CheckCircle } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { WalletAddressCard } from '@presentation/components/wallet/onboarding/wallet-address-card';
import { useWalletStore } from '@application/stores/wallet-store';

export default function WalletSuccessScreen() {
  const wallets = useWalletStore((s) => s.wallets);
  const crossmintWallets = wallets.filter((w) => w.walletProvider === 'crossmint');

  const handleContinue = useCallback(() => {
    router.push('/(app)/onboarding/swap-intro');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12">
        {/* Success icon */}
        <Animated.View entering={BounceIn.duration(600)} className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-success/20 items-center justify-center">
            <CheckCircle size={48} color="#22C55E" />
          </View>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeIn.duration(500).delay(200)}>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-2">
            Wallets Ready
          </Text>
          <Text variant="body" color="secondary" className="text-center mb-8">
            Your smart wallets have been created across {crossmintWallets.length} chains
          </Text>
        </Animated.View>

        {/* Wallet cards */}
        {crossmintWallets.map((wallet, index) => (
          <WalletAddressCard key={wallet.id} wallet={wallet} index={index} />
        ))}

        <View className="flex-1" />

        {/* Continue */}
        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <Button variant="brand" size="lg" fullWidth onPress={handleContinue}>
            Continue
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
```

**Step 3: Commit**

```bash
git add app/\(app\)/onboarding/wallet-success.tsx src/presentation/components/wallet/onboarding/wallet-address-card.tsx
git commit -m "feat(onboarding): add wallet success screen with address cards"
```

---

### Task 20: Swap Intro Screen (Step 3)

**Files:**
- Create: `mobile-expo-app/app/(app)/onboarding/swap-intro.tsx`

**Step 1: Create the screen**

```tsx
// app/(app)/onboarding/swap-intro.tsx

import { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { ArrowLeftRight } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';

export default function SwapIntroScreen() {
  const handleContinue = useCallback(() => {
    router.push('/(app)/onboarding/profile-setup');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12 items-center">
        {/* Icon */}
        <Animated.View entering={FadeIn.duration(600)} className="mb-8 mt-12">
          <View className="w-24 h-24 rounded-3xl bg-brand-muted items-center justify-center">
            <ArrowLeftRight size={48} color="#38bdf8" />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-4">
            Swap Tokens
          </Text>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)}>
          <Text variant="body" color="secondary" className="text-center leading-6 mb-4">
            Swap tokens on Solana using Jupiter, the leading DEX aggregator.
            Get the best rates across multiple liquidity sources.
          </Text>
        </Animated.View>

        {/* Feature list */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} className="w-full">
          {[
            'Best rates via Jupiter aggregation',
            'Swap any Solana token',
            'Low fees and fast execution',
          ].map((feature, i) => (
            <View key={i} className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-brand mr-3" />
              <Text variant="body" className="text-white">
                {feature}
              </Text>
            </View>
          ))}
        </Animated.View>

        <View className="flex-1" />

        {/* Continue */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} className="w-full">
          <Button variant="brand" size="lg" fullWidth onPress={handleContinue}>
            Continue
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/onboarding/swap-intro.tsx
git commit -m "feat(onboarding): add Jupiter swap introduction screen"
```

---

### Task 21: Profile Setup Screen (Step 4) + Complete Onboarding

**Files:**
- Create: `mobile-expo-app/app/(app)/onboarding/profile-setup.tsx`

**Step 1: Create the screen**

```tsx
// app/(app)/onboarding/profile-setup.tsx

import { useCallback, useState } from 'react';
import { View, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { User } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { useAuthStore } from '@application/stores/auth-store';
import { markOnboardingComplete } from '@application/hooks/use-onboarding-gate';

export default function ProfileSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Mark onboarding complete in SecureStore
      await markOnboardingComplete();
      // Navigate to main app
      router.replace('/(app)/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-12">
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-4">
            <User size={40} color="#38bdf8" />
          </View>
          <Text variant="h1" className="text-2xl font-bold text-white text-center mb-2">
            Almost Done
          </Text>
          <Text variant="body" color="secondary" className="text-center">
            Confirm your display name to complete setup
          </Text>
        </Animated.View>

        {/* Display name input */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text variant="caption" color="secondary" className="mb-2 font-medium">
            Display Name
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor="#666"
            className="bg-surface border border-border rounded-xl px-4 py-3 text-white text-base"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={50}
          />
        </Animated.View>

        <View className="flex-1" />

        {/* Complete button */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Button
            variant="brand"
            size="lg"
            fullWidth
            onPress={handleComplete}
            disabled={isSubmitting || !displayName.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              'Complete Setup'
            )}
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/onboarding/profile-setup.tsx
git commit -m "feat(onboarding): add profile setup screen and complete onboarding flow"
```

---

## Phase 7: Wallet Export & Integration (Tasks 22–24)

### Task 22: Wallet Export Screen

**Files:**
- Create: `mobile-expo-app/app/(app)/settings/wallet-export.tsx`

**Step 1: Create the export screen**

```tsx
// app/(app)/settings/wallet-export.tsx

import { useCallback, useState, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ExportPrivateKeyButton } from '@crossmint/client-sdk-react-native-ui';
import { ShieldAlert, ArrowLeft } from 'lucide-react-native';

import { Text } from '@presentation/components/ui/text';
import { Button } from '@presentation/components/ui/button';
import { container, ServiceKeys } from '@application/container';
import type { IBiometricService } from '@application/container';

export default function WalletExportScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const biometric = useMemo(
    () => container.resolve<IBiometricService>(ServiceKeys.BiometricService),
    [],
  );

  const handleAuthenticate = useCallback(async () => {
    setIsAuthenticating(true);
    const result = await biometric.authenticate(
      'Authenticate to export your private key',
    );
    if (result.ok && result.value) {
      setIsAuthenticated(true);
    }
    setIsAuthenticating(false);
  }, [biometric]);

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-4">
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <Button
            variant="secondary"
            size="sm"
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="white" />
          </Button>
          <Text variant="h1" className="text-lg font-bold text-white ml-4">
            Export Private Key
          </Text>
        </View>

        {/* Warning */}
        <View className="bg-destructive/10 rounded-2xl p-4 mb-6 flex-row">
          <ShieldAlert size={24} color="#EF4444" className="mr-3" />
          <View className="flex-1">
            <Text variant="body" className="text-destructive font-semibold mb-1">
              Security Warning
            </Text>
            <Text variant="caption" color="secondary">
              Never share your private key. Anyone with your private key has
              full control of your wallet and all assets in it.
            </Text>
          </View>
        </View>

        {/* Biometric gate */}
        {!isAuthenticated ? (
          <View className="items-center mt-8">
            <Text variant="body" color="secondary" className="text-center mb-6">
              Authenticate with biometrics to proceed
            </Text>
            <Button
              variant="primary"
              size="lg"
              onPress={handleAuthenticate}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                'Authenticate'
              )}
            </Button>
          </View>
        ) : (
          <View className="mt-4">
            <ExportPrivateKeyButton
              appearance={{
                colors: { border: '#2A2A2A' },
                borderRadius: '12px',
              }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/settings/wallet-export.tsx
git commit -m "feat(settings): add biometric-gated wallet export screen"
```

---

### Task 23: Wire Onboarding Gate into Main App

**Files:**
- Modify: `mobile-expo-app/app/(app)/(tabs)/_layout.tsx` (or wherever the main tabs layout is)

**Step 1: Read the current tabs layout**

Read `app/(app)/(tabs)/_layout.tsx` to understand the current structure.

**Step 2: Add the onboarding gate**

Import and call `useOnboardingGate()` at the top of the tabs layout:

```tsx
import { useOnboardingGate } from '@application/hooks/use-onboarding-gate';

export default function TabsLayout() {
  const { isChecking, isOnboarded } = useOnboardingGate();

  // Show nothing while checking onboarding status
  if (isChecking) {
    return null; // Or a loading spinner
  }

  // If not onboarded, the hook already redirected — render nothing
  if (!isOnboarded) {
    return null;
  }

  // ... existing tabs layout
}
```

**Step 3: Type-check**

Run: `cd mobile-expo-app && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add app/\(app\)/\(tabs\)/_layout.tsx
git commit -m "feat(routing): add onboarding gate to main tabs layout"
```

---

### Task 24: Run Full Test Suite & Final Verification

**Step 1: Run type-check**

```bash
cd mobile-expo-app && npx tsc --noEmit
```

**Step 2: Run all tests**

```bash
cd mobile-expo-app && npx vitest run
```

**Step 3: Run lint**

```bash
cd mobile-expo-app && npm run lint
```

**Step 4: Fix any issues found**

Address type errors, test failures, or lint warnings.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: fix type errors and lint issues from Crossmint integration"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1. Environment & Config | 1–3 | Fixed env vars, config validation, SDK installed |
| 2. Domain Layer | 4–6 | Extended wallet entity, Crossmint service port, onboarding types |
| 3. Infrastructure | 7–10 | JWT bridge, Jupiter client, Crossmint adapter, DI registration |
| 4. Application | 11–15 | Onboarding store, hooks (wallet, gate, swap), AI context |
| 5. Providers | 16 | Crossmint provider wrapper, root layout integration |
| 6. Onboarding Screens | 17–21 | Layout, wallet setup, success, swap intro, profile setup |
| 7. Export & Integration | 22–24 | Wallet export, onboarding gate wiring, final verification |

**Total: 24 tasks across 7 phases**
