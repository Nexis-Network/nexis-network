# Wallet Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add price feeds, multi-chain gas modeling, NFTs, staking, token allowances, background polling, and hardened send flow to the Nex-T1 mobile wallet.

**Architecture:** Feature Module Bundles through existing Clean Architecture (domain → application → infrastructure → presentation). Each feature is built end-to-end (types → service → hook → component) before moving to the next. Mobile-only for MVP (direct RPC, no backend proxy for writes).

**Tech Stack:** Expo 52, React Native 0.76, TypeScript 5.7, viem 2.x, @solana/web3.js 1.x, React Query 5.x, Zustand 5.x, vitest, CoinGecko API, Moralis API.

**Path aliases:** `@domain/`, `@application/`, `@infrastructure/`, `@presentation/`, `@config/`, `@shared/`

**Test command:** `npx vitest run <path>` or `npx vitest run --reporter=verbose`

**Existing patterns to follow:**
- `Result<T, E>` from `@domain/common/types` for all fallible operations
- `success(value)` / `failure(error)` constructors
- `WalletError` from `@domain/common/errors/domain-error` for wallet-layer errors
- Branded types: `UUID`, `Timestamp` from `@domain/common/types`
- Zustand stores with `immer` middleware
- React Query with `queryKey` arrays and `staleTime` config
- Max 400 LOC per file

---

## Feature 1: Price Service (CoinGecko)

### Task 1.1: Domain — Price Types

**Files:**
- Create: `src/domain/market/entities/price.ts`

**Step 1: Create domain types**

```ts
// src/domain/market/entities/price.ts
import type { Timestamp } from '@domain/common/types';

export interface TokenPrice {
  readonly id: string;            // CoinGecko ID (e.g. "ethereum")
  readonly symbol: string;        // e.g. "ETH"
  readonly usdPrice: number;
  readonly change24h: number;     // percentage, e.g. -2.5
  readonly lastUpdated: Timestamp;
}

export class PriceError extends Error {
  public readonly code: string;
  constructor(message: string, code = 'PRICE_ERROR') {
    super(message);
    this.name = 'PriceError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Maps chain native tokens and well-known addresses to CoinGecko IDs.
 * Keys are `chainType:tokenAddress` or `chainType:native`.
 */
export const COINGECKO_ID_MAP: Readonly<Record<string, string>> = {
  'evm:native:1': 'ethereum',
  'evm:native:8453': 'ethereum',       // Base uses ETH
  'evm:native:10': 'ethereum',         // Optimism uses ETH
  'evm:native:42161': 'ethereum',      // Arbitrum uses ETH
  'evm:native:137': 'matic-network',
  'evm:native:56': 'binancecoin',
  'evm:native:43114': 'avalanche-2',
  'evm:native:42220': 'celo',
  'solana:native': 'solana',
  'stellar:native': 'stellar',
  // Stablecoins
  'evm:usdc': 'usd-coin',
  'evm:usdt': 'tether',
  'evm:dai': 'dai',
  // Liquid staking tokens
  'evm:steth': 'staked-ether',
  'evm:reth': 'rocket-pool-eth',
  'evm:cbeth': 'coinbase-wrapped-staked-eth',
};
```

**Step 2: Export from barrel**

Add to `src/domain/market/entities/price.ts` — this is a new file, no barrel update needed yet. If `src/domain/market/` doesn't exist, create the directory.

**Step 3: Commit**

```bash
git add src/domain/market/entities/price.ts
git commit -m "feat(domain): add TokenPrice type and CoinGecko ID map"
```

---

### Task 1.2: Infrastructure — CoinGecko API Client

**Files:**
- Create: `src/infrastructure/api/price-api.ts`
- Test: `tests/infrastructure/api/price-api.test.ts`

**Step 1: Write tests**

```ts
// tests/infrastructure/api/price-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getEnv before importing the module under test
vi.mock('@config/env', () => ({
  getEnv: () => ({ COINGECKO_API_KEY: 'test-key' }),
}));

describe('PriceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it('fetchPrices returns TokenPrice[] for valid IDs', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ethereum: { usd: 3200, usd_24h_change: -1.5 },
        solana: { usd: 145, usd_24h_change: 3.2 },
      }),
    });

    const { fetchPrices } = await import('@infrastructure/api/price-api');
    const result = await fetchPrices(['ethereum', 'solana']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]!.id).toBe('ethereum');
      expect(result.value[0]!.usdPrice).toBe(3200);
      expect(result.value[1]!.id).toBe('solana');
    }
  });

  it('fetchPrices returns failure on network error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network timeout'),
    );

    const { fetchPrices } = await import('@infrastructure/api/price-api');
    const result = await fetchPrices(['ethereum']);

    expect(result.ok).toBe(false);
  });

  it('fetchPrices handles empty ID list', async () => {
    const { fetchPrices } = await import('@infrastructure/api/price-api');
    const result = await fetchPrices([]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/infrastructure/api/price-api.test.ts --reporter=verbose
```
Expected: FAIL — module not found.

**Step 3: Implement**

```ts
// src/infrastructure/api/price-api.ts
import { getEnv } from '@config/env';
import { type Result, success, failure, timestampNow } from '@domain/common/types';
import { type TokenPrice, PriceError } from '@domain/market/entities/price';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

/**
 * Batch-fetch USD prices from CoinGecko.
 * Uses the free `/simple/price` endpoint.
 * Rate limit: 10-30 req/min depending on tier.
 */
export async function fetchPrices(
  ids: readonly string[],
): Promise<Result<TokenPrice[], PriceError>> {
  if (ids.length === 0) return success([]);

  const apiKey = getEnv().COINGECKO_API_KEY;
  const deduped = [...new Set(ids)];
  const idsParam = deduped.join(',');

  const url = `${COINGECKO_BASE}/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      return failure(
        new PriceError(`CoinGecko HTTP ${response.status}`, 'HTTP_ERROR'),
      );
    }

    const data = (await response.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;

    const prices: TokenPrice[] = [];
    const now = timestampNow();

    for (const id of deduped) {
      const entry = data[id];
      if (!entry || entry.usd == null) continue;

      prices.push({
        id,
        symbol: id,
        usdPrice: entry.usd,
        change24h: entry.usd_24h_change ?? 0,
        lastUpdated: now,
      });
    }

    return success(prices);
  } catch (err) {
    return failure(
      new PriceError(
        `Price fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
}

/**
 * Fetch a single token price. Convenience wrapper.
 */
export async function fetchPrice(
  id: string,
): Promise<Result<TokenPrice | undefined, PriceError>> {
  const result = await fetchPrices([id]);
  if (!result.ok) return result;
  return success(result.value.find((p) => p.id === id));
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/infrastructure/api/price-api.test.ts --reporter=verbose
```
Expected: 3 tests PASS.

**Step 5: Commit**

```bash
git add src/domain/market/entities/price.ts src/infrastructure/api/price-api.ts tests/infrastructure/api/price-api.test.ts
git commit -m "feat(price): add CoinGecko price API client with tests"
```

---

### Task 1.3: Application — usePrices Hook

**Files:**
- Create: `src/application/hooks/use-prices.ts`

**Step 1: Implement the hook**

```ts
// src/application/hooks/use-prices.ts
import { useQuery } from '@tanstack/react-query';
import { fetchPrices } from '@infrastructure/api/price-api';
import type { TokenPrice } from '@domain/market/entities/price';

const PRICES_QUERY_KEY = 'token-prices';

interface UsePricesOptions {
  readonly ids: readonly string[];
  readonly enabled?: boolean;
}

export function usePrices({ ids, enabled = true }: UsePricesOptions) {
  return useQuery<ReadonlyArray<TokenPrice>>({
    queryKey: [PRICES_QUERY_KEY, ...ids],
    queryFn: async () => {
      const result = await fetchPrices(ids);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: enabled && ids.length > 0,
    staleTime: 15_000,       // 15s before considered stale
    refetchInterval: 30_000, // auto-refetch every 30s
    retry: 2,
  });
}

/**
 * Extract a USD price from the prices array by CoinGecko ID.
 */
export function getPriceById(
  prices: ReadonlyArray<TokenPrice> | undefined,
  id: string,
): number | undefined {
  return prices?.find((p) => p.id === id)?.usdPrice;
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-prices.ts
git commit -m "feat(hooks): add usePrices hook with React Query caching"
```

---

## Feature 2: Gas Modeling

### Task 2.1: Domain — Gas Types

**Files:**
- Create: `src/domain/wallet/entities/gas.ts`

**Step 1: Create types**

```ts
// src/domain/wallet/entities/gas.ts

export type GasSpeed = 'slow' | 'standard' | 'fast';

export interface EvmGasTier {
  readonly speed: GasSpeed;
  readonly gasLimit: bigint;
  readonly maxFeePerGas: bigint;
  readonly maxPriorityFeePerGas: bigint;
  readonly estimatedFeeWei: bigint;
  readonly estimatedFeeNative: string;
  readonly estimatedFeeUsd: number;
}

export interface SolanaGasEstimate {
  readonly lamportsPerSignature: number;
  readonly signatureCount: number;
  readonly totalLamports: number;
  readonly feeSol: string;
  readonly feeUsd: number;
}

export interface StellarGasEstimate {
  readonly baseFeeStroops: number;
  readonly operationCount: number;
  readonly totalStroops: number;
  readonly feeXlm: string;
  readonly feeUsd: number;
}

export type GasEstimate =
  | { readonly chain: 'evm'; readonly tiers: readonly [EvmGasTier, EvmGasTier, EvmGasTier] }
  | { readonly chain: 'solana'; readonly estimate: SolanaGasEstimate }
  | { readonly chain: 'stellar'; readonly estimate: StellarGasEstimate };
```

**Step 2: Export from entities barrel**

Add to `src/domain/wallet/entities/index.ts`:
```ts
export type {
  GasSpeed,
  EvmGasTier,
  SolanaGasEstimate,
  StellarGasEstimate,
  GasEstimate,
} from './gas';
```

**Step 3: Commit**

```bash
git add src/domain/wallet/entities/gas.ts src/domain/wallet/entities/index.ts
git commit -m "feat(domain): add multi-chain gas estimation types"
```

---

### Task 2.2: Infrastructure — Gas Service

**Files:**
- Create: `src/infrastructure/wallet/gas-service.ts`
- Test: `tests/infrastructure/wallet/gas-service.test.ts`

**Step 1: Write tests**

```ts
// tests/infrastructure/wallet/gas-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@config/chains', () => ({
  getChainById: (id: number | string) => {
    if (id === 1) return { id: 1, name: 'Ethereum', symbol: 'ETH', decimals: 18, type: 'evm', rpcUrl: 'https://eth.test', explorerUrl: '', iconName: '', isTestnet: false };
    if (id === 'solana-mainnet') return { id: 'solana-mainnet', name: 'Solana', symbol: 'SOL', decimals: 9, type: 'solana', rpcUrl: 'https://sol.test', explorerUrl: '', iconName: '', isTestnet: false };
    return undefined;
  },
  getSolanaChain: () => ({ rpcUrl: 'https://sol.test' }),
  getStellarChain: () => ({ rpcUrl: 'https://horizon.stellar.org' }),
}));

vi.mock('@infrastructure/api/price-api', () => ({
  fetchPrices: vi.fn().mockResolvedValue({
    ok: true,
    value: [
      { id: 'ethereum', usdPrice: 3200, change24h: 0, lastUpdated: Date.now() },
      { id: 'solana', usdPrice: 145, change24h: 0, lastUpdated: Date.now() },
      { id: 'stellar', usdPrice: 0.12, change24h: 0, lastUpdated: Date.now() },
    ],
  }),
}));

describe('Gas Service', () => {
  it('estimateStellarGas returns correct calculation', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ last_ledger_base_fee: '100' }),
    });

    const { estimateStellarGas } = await import('@infrastructure/wallet/gas-service');
    const result = await estimateStellarGas(1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.baseFeeStroops).toBe(100);
      expect(result.value.operationCount).toBe(1);
      expect(result.value.totalStroops).toBe(100);
      expect(result.value.feeXlm).toBe('0.0000100');
    }
  });

  it('estimateSolanaGas returns lamport-based estimate', async () => {
    const { estimateSolanaGas } = await import('@infrastructure/wallet/gas-service');
    const result = await estimateSolanaGas(1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.lamportsPerSignature).toBe(5000);
      expect(result.value.signatureCount).toBe(1);
      expect(result.value.totalLamports).toBe(5000);
    }
  });
});
```

**Step 2: Run tests to confirm failure**

```bash
npx vitest run tests/infrastructure/wallet/gas-service.test.ts --reporter=verbose
```

**Step 3: Implement**

```ts
// src/infrastructure/wallet/gas-service.ts
import { formatUnits } from 'viem';
import { getStellarChain } from '@config/chains';
import { type Result, success, failure } from '@domain/common/types';
import type {
  EvmGasTier,
  GasSpeed,
  SolanaGasEstimate,
  StellarGasEstimate,
} from '@domain/wallet/entities/gas';
import { WalletError } from '@domain/common/errors/domain-error';
import { fetchPrices } from '@infrastructure/api/price-api';
import { COINGECKO_ID_MAP } from '@domain/market/entities/price';

// Re-use the viem client cache from evm-adapter
import * as EvmAdapter from './evm-adapter';

const LAMPORTS_PER_SIGNATURE = 5_000;
const LAMPORTS_PER_SOL = 1_000_000_000;
const STROOPS_PER_XLM = 10_000_000;

// ---------------------------------------------------------------------------
// EVM — EIP-1559 speed tiers
// ---------------------------------------------------------------------------

export async function estimateEvmGasTiers(params: {
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly data?: string;
  readonly chainId: number;
}): Promise<Result<readonly [EvmGasTier, EvmGasTier, EvmGasTier], WalletError>> {
  // Get gas limit
  const gasLimitResult = await EvmAdapter.estimateGas(params);
  if (!gasLimitResult.ok) return gasLimitResult;
  const gasLimit = gasLimitResult.value;

  // Get gas price as fallback base fee
  const gasPriceResult = await EvmAdapter.getGasPrice(params.chainId);
  if (!gasPriceResult.ok) return gasPriceResult;
  const baseGasPrice = gasPriceResult.value;

  // Fetch USD price for native token
  const cgKey = `evm:native:${params.chainId}`;
  const cgId = COINGECKO_ID_MAP[cgKey] ?? 'ethereum';
  const priceResult = await fetchPrices([cgId]);
  const nativeUsdPrice = priceResult.ok
    ? (priceResult.value.find((p) => p.id === cgId)?.usdPrice ?? 0)
    : 0;

  // Build tiers with multipliers
  const multipliers: Record<GasSpeed, bigint> = {
    slow: 80n,     // 80% of base
    standard: 100n, // 100% of base
    fast: 130n,     // 130% of base
  };

  const speeds: GasSpeed[] = ['slow', 'standard', 'fast'];

  const tiers = speeds.map((speed) => {
    const mult = multipliers[speed];
    const maxFeePerGas = (baseGasPrice * mult) / 100n;
    const maxPriorityFeePerGas = (baseGasPrice * (mult - 80n > 0n ? mult - 80n : 10n)) / 100n;
    const estimatedFeeWei = maxFeePerGas * gasLimit;
    const estimatedFeeNative = formatUnits(estimatedFeeWei, 18);
    const estimatedFeeUsd = Number(estimatedFeeNative) * nativeUsdPrice;

    return {
      speed,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedFeeWei,
      estimatedFeeNative,
      estimatedFeeUsd,
    } satisfies EvmGasTier;
  }) as [EvmGasTier, EvmGasTier, EvmGasTier];

  return success(tiers);
}

// ---------------------------------------------------------------------------
// Solana
// ---------------------------------------------------------------------------

export async function estimateSolanaGas(
  signatureCount = 1,
): Promise<Result<SolanaGasEstimate, WalletError>> {
  try {
    const totalLamports = LAMPORTS_PER_SIGNATURE * signatureCount;
    const feeSol = (totalLamports / LAMPORTS_PER_SOL).toFixed(9);

    // Fetch SOL price
    const priceResult = await fetchPrices(['solana']);
    const solPrice = priceResult.ok
      ? (priceResult.value.find((p) => p.id === 'solana')?.usdPrice ?? 0)
      : 0;

    return success({
      lamportsPerSignature: LAMPORTS_PER_SIGNATURE,
      signatureCount,
      totalLamports,
      feeSol,
      feeUsd: Number(feeSol) * solPrice,
    });
  } catch (err) {
    return failure(
      new WalletError(`Solana gas estimation failed: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}

// ---------------------------------------------------------------------------
// Stellar
// ---------------------------------------------------------------------------

export async function estimateStellarGas(
  operationCount = 1,
): Promise<Result<StellarGasEstimate, WalletError>> {
  try {
    const horizonUrl = getStellarChain()?.rpcUrl ?? 'https://horizon.stellar.org';
    const response = await fetch(`${horizonUrl.replace(/\/+$/, '')}/fee_stats`, {
      headers: { Accept: 'application/json' },
    });

    let baseFeeStroops = 100; // Default
    if (response.ok) {
      const data = (await response.json()) as { last_ledger_base_fee?: string };
      if (data.last_ledger_base_fee) {
        baseFeeStroops = Number(data.last_ledger_base_fee);
      }
    }

    const totalStroops = baseFeeStroops * operationCount;
    const feeXlm = (totalStroops / STROOPS_PER_XLM).toFixed(7);

    // Fetch XLM price
    const priceResult = await fetchPrices(['stellar']);
    const xlmPrice = priceResult.ok
      ? (priceResult.value.find((p) => p.id === 'stellar')?.usdPrice ?? 0)
      : 0;

    return success({
      baseFeeStroops,
      operationCount,
      totalStroops,
      feeXlm,
      feeUsd: Number(feeXlm) * xlmPrice,
    });
  } catch (err) {
    return failure(
      new WalletError(`Stellar gas estimation failed: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run tests/infrastructure/wallet/gas-service.test.ts --reporter=verbose
```

**Step 5: Commit**

```bash
git add src/domain/wallet/entities/gas.ts src/domain/wallet/entities/index.ts src/infrastructure/wallet/gas-service.ts tests/infrastructure/wallet/gas-service.test.ts
git commit -m "feat(gas): add multi-chain gas estimation service (EVM tiers, Solana, Stellar)"
```

---

### Task 2.3: Application — Enhanced useGasFeeEstimate

**Files:**
- Modify: `src/application/hooks/use-gas-fee-estimate.ts`

**Step 1: Rewrite the hook to support all chains**

Replace the entire file content. The new hook dispatches to the correct gas service based on `chainType`. Keep the existing export name for backward compatibility.

```ts
// src/application/hooks/use-gas-fee-estimate.ts
import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import type { ChainType } from '@domain/wallet/entities/wallet';
import type { GasEstimate } from '@domain/wallet/entities/gas';
import {
  estimateEvmGasTiers,
  estimateSolanaGas,
  estimateStellarGas,
} from '@infrastructure/wallet/gas-service';

export interface GasFeeEstimateParams {
  readonly chainType: ChainType;
  readonly chainId: number | string;
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly data?: string;
  readonly enabled?: boolean;
}

// Keep old interface for backward compat
export interface GasFeeEstimate {
  readonly gasLimit: bigint;
  readonly gasPriceWei: bigint;
  readonly feeWei: bigint;
  readonly feeNative: string;
}

const GAS_FEE_QUERY_KEY = 'gas-fee-estimate-v2';

export function useMultiChainGasEstimate(params: GasFeeEstimateParams) {
  const enabled = params.enabled ?? true;

  return useQuery<GasEstimate>({
    queryKey: [GAS_FEE_QUERY_KEY, params.chainType, params.chainId, params.from, params.to, params.value],
    queryFn: async (): Promise<GasEstimate> => {
      if (params.chainType === 'evm' && typeof params.chainId === 'number') {
        const result = await estimateEvmGasTiers({
          from: params.from,
          to: params.to,
          value: params.value,
          data: params.data,
          chainId: params.chainId,
        });
        if (!result.ok) throw new Error(result.error.message);
        return { chain: 'evm', tiers: result.value };
      }

      if (params.chainType === 'solana') {
        const result = await estimateSolanaGas(1);
        if (!result.ok) throw new Error(result.error.message);
        return { chain: 'solana', estimate: result.value };
      }

      if (params.chainType === 'stellar') {
        const result = await estimateStellarGas(1);
        if (!result.ok) throw new Error(result.error.message);
        return { chain: 'stellar', estimate: result.value };
      }

      throw new Error(`Unsupported chain type for gas: ${params.chainType}`);
    },
    enabled: enabled && params.from.length > 0 && params.to.length > 0,
    staleTime: 15_000,
    retry: 1,
  });
}

// Backward-compatible hook (EVM only)
export type UseGasFeeEstimateReturn = UseQueryResult<GasFeeEstimate> & {
  readonly feeGwei: string | null;
};

export function useGasFeeEstimate(params: {
  readonly chainId: number;
  readonly from: string;
  readonly to: string;
  readonly value: string;
  readonly data?: string;
  readonly enabled?: boolean;
}): UseGasFeeEstimateReturn {
  const query = useMultiChainGasEstimate({
    chainType: 'evm',
    ...params,
  });

  const legacyData: GasFeeEstimate | undefined = useMemo(() => {
    if (!query.data || query.data.chain !== 'evm') return undefined;
    const standard = query.data.tiers[1]; // standard tier
    return {
      gasLimit: standard.gasLimit,
      gasPriceWei: standard.maxFeePerGas,
      feeWei: standard.estimatedFeeWei,
      feeNative: standard.estimatedFeeNative,
    };
  }, [query.data]);

  const feeGwei = useMemo(() => {
    if (!legacyData) return null;
    return formatUnits(legacyData.gasPriceWei, 9);
  }, [legacyData]);

  return {
    ...query,
    data: legacyData,
    feeGwei,
  } as UseGasFeeEstimateReturn;
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-gas-fee-estimate.ts
git commit -m "feat(hooks): enhance gas estimate hook for multi-chain support"
```

---

## Feature 3: NFT Modeling

### Task 3.1: Domain — NFT Types

**Files:**
- Create: `src/domain/wallet/entities/nft.ts`
- Modify: `src/domain/wallet/entities/index.ts`

**Step 1: Create types**

```ts
// src/domain/wallet/entities/nft.ts
import type { ChainType } from './wallet';

export type NFTStandard = 'ERC-721' | 'ERC-1155' | 'SPL' | 'Metaplex';

export interface NFTAttribute {
  readonly traitType: string;
  readonly value: string;
}

export interface NFT {
  readonly tokenId: string;
  readonly contractAddress: string;
  readonly chain: ChainType;
  readonly chainId: number | string;
  readonly name: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly collectionName?: string;
  readonly standard: NFTStandard;
  readonly attributes?: ReadonlyArray<NFTAttribute>;
}
```

**Step 2: Export from barrel**

Add to `src/domain/wallet/entities/index.ts`:
```ts
export type { NFT, NFTAttribute, NFTStandard } from './nft';
```

**Step 3: Commit**

```bash
git add src/domain/wallet/entities/nft.ts src/domain/wallet/entities/index.ts
git commit -m "feat(domain): add NFT entity types"
```

---

### Task 3.2: Infrastructure — NFT Service

**Files:**
- Create: `src/infrastructure/wallet/nft-service.ts`
- Test: `tests/infrastructure/wallet/nft-service.test.ts`

**Step 1: Write tests**

```ts
// tests/infrastructure/wallet/nft-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@config/env', () => ({
  getEnv: () => ({ MORALIS_API_KEY: 'test-moralis-key' }),
}));

describe('NFT Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it('fetchEvmNFTs returns NFTs from Moralis API', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: [
          {
            token_id: '1',
            token_address: '0xabc',
            name: 'Cool NFT',
            metadata: JSON.stringify({ description: 'A cool one', image: 'https://img.test/1.png' }),
            contract_type: 'ERC721',
            symbol: 'COOL',
          },
        ],
      }),
    });

    const { fetchEvmNFTs } = await import('@infrastructure/wallet/nft-service');
    const result = await fetchEvmNFTs('0x123', 1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.name).toBe('Cool NFT');
      expect(result.value[0]!.standard).toBe('ERC-721');
    }
  });

  it('fetchEvmNFTs handles missing API key gracefully', async () => {
    vi.doMock('@config/env', () => ({
      getEnv: () => ({ MORALIS_API_KEY: undefined }),
    }));

    // Re-import to get fresh module
    const { fetchEvmNFTs } = await import('@infrastructure/wallet/nft-service');
    const result = await fetchEvmNFTs('0x123', 1);

    // Should return empty array, not error
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});
```

**Step 2: Implement**

```ts
// src/infrastructure/wallet/nft-service.ts
import { getEnv } from '@config/env';
import { type Result, success, failure } from '@domain/common/types';
import type { NFT } from '@domain/wallet/entities/nft';
import { WalletError } from '@domain/common/errors/domain-error';

const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2';

const MORALIS_CHAIN_MAP: Record<number, string> = {
  1: '0x1',
  8453: '0x2105',
  137: '0x89',
  56: '0x38',
  42161: '0xa4b1',
  10: '0xa',
  43114: '0xa86a',
};

interface MoralisNFTResult {
  token_id: string;
  token_address: string;
  name?: string;
  metadata?: string;
  contract_type?: string;
  symbol?: string;
}

export async function fetchEvmNFTs(
  address: string,
  chainId: number,
): Promise<Result<NFT[], WalletError>> {
  const apiKey = getEnv().MORALIS_API_KEY;
  if (!apiKey) return success([]); // Graceful degradation

  const moralisChain = MORALIS_CHAIN_MAP[chainId];
  if (!moralisChain) return success([]);

  try {
    const response = await fetch(
      `${MORALIS_BASE}/${address}/nft?chain=${moralisChain}&format=decimal&limit=50`,
      {
        headers: {
          Accept: 'application/json',
          'X-API-Key': apiKey,
        },
      },
    );

    if (!response.ok) {
      return failure(new WalletError(`Moralis HTTP ${response.status}`));
    }

    const data = (await response.json()) as { result?: MoralisNFTResult[] };
    const nfts: NFT[] = [];

    for (const item of data.result ?? []) {
      let description: string | undefined;
      let imageUrl: string | undefined;

      if (item.metadata) {
        try {
          const meta = JSON.parse(item.metadata) as {
            description?: string;
            image?: string;
          };
          description = meta.description;
          imageUrl = meta.image;
        } catch {
          // Malformed metadata — skip
        }
      }

      const standard =
        item.contract_type === 'ERC1155' ? 'ERC-1155' as const : 'ERC-721' as const;

      nfts.push({
        tokenId: item.token_id,
        contractAddress: item.token_address,
        chain: 'evm',
        chainId,
        name: item.name ?? `#${item.token_id}`,
        description,
        imageUrl,
        collectionName: item.symbol,
        standard,
      });
    }

    return success(nfts);
  } catch (err) {
    return failure(
      new WalletError(`NFT fetch failed: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}
```

**Step 3: Run tests**

```bash
npx vitest run tests/infrastructure/wallet/nft-service.test.ts --reporter=verbose
```

**Step 4: Commit**

```bash
git add src/domain/wallet/entities/nft.ts src/domain/wallet/entities/index.ts src/infrastructure/wallet/nft-service.ts tests/infrastructure/wallet/nft-service.test.ts
git commit -m "feat(nft): add NFT service with Moralis integration and tests"
```

---

### Task 3.3: Application — useNFTs Hook

**Files:**
- Create: `src/application/hooks/use-nfts.ts`

**Step 1: Implement**

```ts
// src/application/hooks/use-nfts.ts
import { useQuery } from '@tanstack/react-query';
import type { NFT } from '@domain/wallet/entities/nft';
import { fetchEvmNFTs } from '@infrastructure/wallet/nft-service';

const NFTS_QUERY_KEY = 'wallet-nfts';

interface UseNFTsOptions {
  readonly address: string;
  readonly chainType: 'evm' | 'solana' | 'stellar' | 'sui';
  readonly chainId: number | string;
  readonly enabled?: boolean;
}

export function useNFTs({ address, chainType, chainId, enabled = true }: UseNFTsOptions) {
  return useQuery<ReadonlyArray<NFT>>({
    queryKey: [NFTS_QUERY_KEY, address, chainType, chainId],
    queryFn: async () => {
      if (chainType === 'evm' && typeof chainId === 'number') {
        const result = await fetchEvmNFTs(address, chainId);
        if (!result.ok) throw new Error(result.error.message);
        return result.value;
      }
      // Solana NFT fetching can be added here later
      return [];
    },
    enabled: enabled && address.length > 0,
    staleTime: 60_000, // NFTs don't change often
    retry: 1,
  });
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-nfts.ts
git commit -m "feat(hooks): add useNFTs hook for multi-chain NFT fetching"
```

---

## Feature 4: Staking Modeling

### Task 4.1: Domain — Staking Types

**Files:**
- Create: `src/domain/wallet/entities/staking.ts`
- Modify: `src/domain/wallet/entities/index.ts`

**Step 1: Create types**

```ts
// src/domain/wallet/entities/staking.ts
import type { Timestamp } from '@domain/common/types';
import type { ChainType } from './wallet';

export interface StakingPosition {
  readonly id: string;
  readonly chain: ChainType;
  readonly chainId: number | string;
  readonly protocolName: string;
  readonly stakedTokenSymbol: string;
  readonly stakedTokenAddress: string;
  readonly amountStaked: string;           // raw (wei / lamports)
  readonly amountStakedFormatted: string;  // human-readable
  readonly amountStakedUsd: number;
  readonly rewardsAccrued: string;
  readonly rewardsAccruedUsd: number;
  readonly apy?: number;
  readonly unlockDate?: Timestamp;
  readonly canUnstake: boolean;
  readonly canClaimRewards: boolean;
}
```

**Step 2: Export from barrel**

Add to `src/domain/wallet/entities/index.ts`:
```ts
export type { StakingPosition } from './staking';
```

**Step 3: Commit**

```bash
git add src/domain/wallet/entities/staking.ts src/domain/wallet/entities/index.ts
git commit -m "feat(domain): add StakingPosition entity type"
```

---

### Task 4.2: Infrastructure — Staking Service

**Files:**
- Create: `src/infrastructure/wallet/staking-service.ts`
- Test: `tests/infrastructure/wallet/staking-service.test.ts`

**Step 1: Write tests**

```ts
// tests/infrastructure/wallet/staking-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
  formatUnits: (val: bigint, decimals: number) => (Number(val) / 10 ** decimals).toString(),
}));

vi.mock('@config/chains', () => ({
  getChainById: () => ({ id: 1, name: 'Ethereum', symbol: 'ETH', decimals: 18, type: 'evm', rpcUrl: 'https://eth.test', explorerUrl: '', iconName: '', isTestnet: false }),
}));

vi.mock('@infrastructure/api/price-api', () => ({
  fetchPrices: vi.fn().mockResolvedValue({
    ok: true,
    value: [{ id: 'staked-ether', usdPrice: 3200, change24h: 0, lastUpdated: Date.now() }],
  }),
}));

describe('Staking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mapLSTBalanceToPosition creates correct StakingPosition', async () => {
    const { mapLSTBalanceToPosition } = await import('@infrastructure/wallet/staking-service');
    const position = mapLSTBalanceToPosition({
      tokenSymbol: 'stETH',
      tokenAddress: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      balance: '1000000000000000000', // 1 stETH
      decimals: 18,
      chainId: 1,
      protocolName: 'Lido',
      coingeckoId: 'staked-ether',
      usdPrice: 3200,
    });

    expect(position.stakedTokenSymbol).toBe('stETH');
    expect(position.amountStakedFormatted).toBe('1');
    expect(position.amountStakedUsd).toBe(3200);
    expect(position.canUnstake).toBe(true);
  });
});
```

**Step 2: Implement**

```ts
// src/infrastructure/wallet/staking-service.ts
import { formatUnits } from 'viem';
import { type Result, success, failure } from '@domain/common/types';
import type { StakingPosition } from '@domain/wallet/entities/staking';
import { WalletError } from '@domain/common/errors/domain-error';
import { fetchPrices } from '@infrastructure/api/price-api';
import * as EvmAdapter from './evm-adapter';

/**
 * Well-known Liquid Staking Tokens and their metadata.
 */
const LST_REGISTRY: ReadonlyArray<{
  readonly chainId: number;
  readonly address: string;
  readonly symbol: string;
  readonly protocolName: string;
  readonly coingeckoId: string;
  readonly decimals: number;
  readonly apy: number; // approximate
}> = [
  { chainId: 1, address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', symbol: 'stETH', protocolName: 'Lido', coingeckoId: 'staked-ether', decimals: 18, apy: 3.2 },
  { chainId: 1, address: '0xae78736Cd615f374D3085123A210448E74Fc6393', symbol: 'rETH', protocolName: 'Rocket Pool', coingeckoId: 'rocket-pool-eth', decimals: 18, apy: 2.9 },
  { chainId: 1, address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', symbol: 'cbETH', protocolName: 'Coinbase', coingeckoId: 'coinbase-wrapped-staked-eth', decimals: 18, apy: 2.8 },
  { chainId: 8453, address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', symbol: 'cbETH', protocolName: 'Coinbase', coingeckoId: 'coinbase-wrapped-staked-eth', decimals: 18, apy: 2.8 },
];

export interface LSTBalanceInput {
  readonly tokenSymbol: string;
  readonly tokenAddress: string;
  readonly balance: string;
  readonly decimals: number;
  readonly chainId: number;
  readonly protocolName: string;
  readonly coingeckoId: string;
  readonly usdPrice: number;
}

export function mapLSTBalanceToPosition(input: LSTBalanceInput): StakingPosition {
  const formatted = formatUnits(BigInt(input.balance), input.decimals);
  return {
    id: `${input.chainId}:${input.tokenAddress}`,
    chain: 'evm',
    chainId: input.chainId,
    protocolName: input.protocolName,
    stakedTokenSymbol: input.tokenSymbol,
    stakedTokenAddress: input.tokenAddress,
    amountStaked: input.balance,
    amountStakedFormatted: formatted,
    amountStakedUsd: Number(formatted) * input.usdPrice,
    rewardsAccrued: '0',
    rewardsAccruedUsd: 0,
    apy: LST_REGISTRY.find((l) => l.address === input.tokenAddress)?.apy,
    canUnstake: true,
    canClaimRewards: false,
  };
}

/**
 * Detect LST positions across all EVM chains for a given address.
 */
export async function fetchEvmStakingPositions(
  address: string,
): Promise<Result<StakingPosition[], WalletError>> {
  try {
    const cgIds = [...new Set(LST_REGISTRY.map((l) => l.coingeckoId))];
    const priceResult = await fetchPrices(cgIds);
    const priceMap = new Map<string, number>();
    if (priceResult.ok) {
      for (const p of priceResult.value) {
        priceMap.set(p.id, p.usdPrice);
      }
    }

    const positions: StakingPosition[] = [];

    // Group LSTs by chainId for batched reads
    const byChain = new Map<number, typeof LST_REGISTRY>();
    for (const lst of LST_REGISTRY) {
      const existing = byChain.get(lst.chainId) ?? [];
      byChain.set(lst.chainId, [...existing, lst]);
    }

    const chainResults = await Promise.allSettled(
      Array.from(byChain.entries()).map(async ([chainId, lsts]) => {
        const tokenResult = await EvmAdapter.getTokenBalances(address, chainId);
        if (!tokenResult.ok) return [];

        const chainPositions: StakingPosition[] = [];
        for (const lst of lsts) {
          const tokenBalance = tokenResult.value.find(
            (t) => t.tokenAddress.toLowerCase() === lst.address.toLowerCase(),
          );
          if (tokenBalance && BigInt(tokenBalance.balance) > 0n) {
            chainPositions.push(
              mapLSTBalanceToPosition({
                tokenSymbol: lst.symbol,
                tokenAddress: lst.address,
                balance: tokenBalance.balance,
                decimals: lst.decimals,
                chainId,
                protocolName: lst.protocolName,
                coingeckoId: lst.coingeckoId,
                usdPrice: priceMap.get(lst.coingeckoId) ?? 0,
              }),
            );
          }
        }
        return chainPositions;
      }),
    );

    for (const result of chainResults) {
      if (result.status === 'fulfilled') {
        positions.push(...result.value);
      }
    }

    return success(positions);
  } catch (err) {
    return failure(
      new WalletError(`Staking fetch failed: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}
```

**Step 3: Run tests**

```bash
npx vitest run tests/infrastructure/wallet/staking-service.test.ts --reporter=verbose
```

**Step 4: Commit**

```bash
git add src/domain/wallet/entities/staking.ts src/domain/wallet/entities/index.ts src/infrastructure/wallet/staking-service.ts tests/infrastructure/wallet/staking-service.test.ts
git commit -m "feat(staking): add LST detection service with price integration"
```

---

### Task 4.3: Application — useStaking Hook

**Files:**
- Create: `src/application/hooks/use-staking.ts`

**Step 1: Implement**

```ts
// src/application/hooks/use-staking.ts
import { useQuery } from '@tanstack/react-query';
import type { StakingPosition } from '@domain/wallet/entities/staking';
import { fetchEvmStakingPositions } from '@infrastructure/wallet/staking-service';

const STAKING_QUERY_KEY = 'staking-positions';

export function useStaking(address: string, enabled = true) {
  return useQuery<ReadonlyArray<StakingPosition>>({
    queryKey: [STAKING_QUERY_KEY, address],
    queryFn: async () => {
      const result = await fetchEvmStakingPositions(address);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: enabled && address.length > 0,
    staleTime: 45_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-staking.ts
git commit -m "feat(hooks): add useStaking hook for LST position tracking"
```

---

## Feature 5: Token Allowances

### Task 5.1: Domain — Allowance Types

**Files:**
- Create: `src/domain/wallet/entities/allowance.ts`
- Modify: `src/domain/wallet/entities/index.ts`

**Step 1: Create types**

```ts
// src/domain/wallet/entities/allowance.ts

export interface TokenAllowance {
  readonly id: string;
  readonly chainId: number;
  readonly tokenSymbol: string;
  readonly tokenAddress: string;
  readonly tokenDecimals: number;
  readonly spenderAddress: string;
  readonly spenderLabel?: string;
  readonly allowanceRaw: string;
  readonly allowanceFormatted: string;
  readonly isUnlimited: boolean;
}

// 2^128 — any allowance above this is considered "unlimited"
export const UNLIMITED_THRESHOLD = 2n ** 128n;

export function isUnlimitedAllowance(raw: string): boolean {
  try {
    return BigInt(raw) >= UNLIMITED_THRESHOLD;
  } catch {
    return false;
  }
}
```

**Step 2: Export from barrel**

Add to `src/domain/wallet/entities/index.ts`:
```ts
export type { TokenAllowance } from './allowance';
export { isUnlimitedAllowance, UNLIMITED_THRESHOLD } from './allowance';
```

**Step 3: Commit**

```bash
git add src/domain/wallet/entities/allowance.ts src/domain/wallet/entities/index.ts
git commit -m "feat(domain): add TokenAllowance entity with unlimited detection"
```

---

### Task 5.2: Infrastructure — Allowance Service

**Files:**
- Create: `src/infrastructure/wallet/allowance-service.ts`
- Test: `tests/infrastructure/wallet/allowance-service.test.ts`

**Step 1: Write tests**

```ts
// tests/infrastructure/wallet/allowance-service.test.ts
import { describe, it, expect } from 'vitest';
import { isUnlimitedAllowance } from '@domain/wallet/entities/allowance';

describe('Allowance utilities', () => {
  it('detects unlimited allowance (max uint256)', () => {
    const maxUint256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
    expect(isUnlimitedAllowance(maxUint256)).toBe(true);
  });

  it('detects limited allowance', () => {
    expect(isUnlimitedAllowance('1000000000000000000')).toBe(false); // 1 ETH
  });

  it('handles zero allowance', () => {
    expect(isUnlimitedAllowance('0')).toBe(false);
  });

  it('handles invalid input', () => {
    expect(isUnlimitedAllowance('not-a-number')).toBe(false);
  });
});
```

**Step 2: Implement allowance service**

```ts
// src/infrastructure/wallet/allowance-service.ts
import {
  createPublicClient,
  http,
  formatUnits,
  encodeFunctionData,
  type Address,
  type PublicClient,
} from 'viem';
import { getChainById } from '@config/chains';
import { type Result, success, failure } from '@domain/common/types';
import type { TokenAllowance } from '@domain/wallet/entities/allowance';
import { isUnlimitedAllowance } from '@domain/wallet/entities/allowance';
import { WalletError } from '@domain/common/errors/domain-error';

const ERC20_ALLOWANCE_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/** Well-known DEX router addresses to check for approvals. */
const KNOWN_SPENDERS: ReadonlyArray<{ readonly address: string; readonly label: string }> = [
  { address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', label: 'Uniswap V3 Router' },
  { address: '0x1111111254EEB25477B68fb85Ed929f73A960582', label: '1inch Router' },
  { address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF', label: '0x Exchange' },
];

/**
 * Check ERC-20 allowances for a token against known spenders.
 */
export async function checkAllowances(
  ownerAddress: string,
  tokenAddress: string,
  tokenSymbol: string,
  tokenDecimals: number,
  chainId: number,
): Promise<Result<TokenAllowance[], WalletError>> {
  const chainConfig = getChainById(chainId);
  if (!chainConfig) {
    return failure(new WalletError(`Unknown chain: ${chainId}`));
  }

  try {
    const client = createPublicClient({
      transport: http(chainConfig.rpcUrl, { timeout: 10_000 }),
    }) as PublicClient;

    const results = await Promise.allSettled(
      KNOWN_SPENDERS.map(async (spender) => {
        const raw = await client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ALLOWANCE_ABI,
          functionName: 'allowance',
          args: [ownerAddress as Address, spender.address as Address],
        });

        const rawStr = (raw as bigint).toString();
        if (rawStr === '0') return null;

        return {
          id: `${chainId}:${tokenAddress}:${spender.address}`,
          chainId,
          tokenSymbol,
          tokenAddress,
          tokenDecimals,
          spenderAddress: spender.address,
          spenderLabel: spender.label,
          allowanceRaw: rawStr,
          allowanceFormatted: formatUnits(raw as bigint, tokenDecimals),
          isUnlimited: isUnlimitedAllowance(rawStr),
        } satisfies TokenAllowance;
      }),
    );

    const allowances: TokenAllowance[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        allowances.push(result.value);
      }
    }

    return success(allowances);
  } catch (err) {
    return failure(
      new WalletError(`Allowance check failed: ${err instanceof Error ? err.message : String(err)}`),
    );
  }
}

/**
 * Build calldata for an ERC-20 approve(spender, 0) revocation.
 */
export function buildRevokeTx(
  tokenAddress: string,
  spenderAddress: string,
): { to: string; data: string; value: string } {
  const data = encodeFunctionData({
    abi: ERC20_ALLOWANCE_ABI,
    functionName: 'approve',
    args: [spenderAddress as Address, 0n],
  });

  return {
    to: tokenAddress,
    data,
    value: '0',
  };
}
```

**Step 3: Run tests**

```bash
npx vitest run tests/infrastructure/wallet/allowance-service.test.ts --reporter=verbose
```

**Step 4: Commit**

```bash
git add src/domain/wallet/entities/allowance.ts src/domain/wallet/entities/index.ts src/infrastructure/wallet/allowance-service.ts tests/infrastructure/wallet/allowance-service.test.ts
git commit -m "feat(allowances): add ERC-20 allowance detection and revoke builder"
```

---

### Task 5.3: Application — useAllowances Hook

**Files:**
- Create: `src/application/hooks/use-allowances.ts`

**Step 1: Implement**

```ts
// src/application/hooks/use-allowances.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TokenAllowance } from '@domain/wallet/entities/allowance';
import type { TokenBalance } from '@domain/wallet/entities/wallet';
import { checkAllowances, buildRevokeTx } from '@infrastructure/wallet/allowance-service';

const ALLOWANCES_QUERY_KEY = 'token-allowances';

interface UseAllowancesOptions {
  readonly address: string;
  readonly tokens: ReadonlyArray<TokenBalance>;
  readonly chainId: number;
  readonly enabled?: boolean;
}

export function useAllowances({ address, tokens, chainId, enabled = true }: UseAllowancesOptions) {
  return useQuery<ReadonlyArray<TokenAllowance>>({
    queryKey: [ALLOWANCES_QUERY_KEY, address, chainId, tokens.map((t) => t.tokenAddress).join(',')],
    queryFn: async () => {
      const allAllowances: TokenAllowance[] = [];

      const results = await Promise.allSettled(
        tokens.map((token) =>
          checkAllowances(address, token.tokenAddress, token.symbol, token.decimals, chainId),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.ok) {
          allAllowances.push(...result.value.value);
        }
      }

      return allAllowances;
    },
    enabled: enabled && address.length > 0 && tokens.length > 0,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  });
}

export function useRevokeAllowance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tokenAddress: string; spenderAddress: string }) => {
      return buildRevokeTx(params.tokenAddress, params.spenderAddress);
    },
    onSuccess: () => {
      // Invalidate allowances to trigger refetch
      queryClient.invalidateQueries({ queryKey: [ALLOWANCES_QUERY_KEY] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-allowances.ts
git commit -m "feat(hooks): add useAllowances and useRevokeAllowance hooks"
```

---

## Feature 6: Background Polling

### Task 6.1: Infrastructure — Polling Service

**Files:**
- Create: `src/infrastructure/wallet/polling-service.ts`

**Step 1: Implement**

```ts
// src/infrastructure/wallet/polling-service.ts
import { AppState, type AppStateStatus } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';

export interface PollingConfig {
  readonly queryKeys: readonly string[];
  readonly intervalMs: number;
}

const DEFAULT_CONFIGS: PollingConfig[] = [
  { queryKeys: ['token-prices'], intervalMs: 30_000 },
  { queryKeys: ['wallet-balances', 'wallet-portfolio'], intervalMs: 45_000 },
  { queryKeys: ['staking-positions'], intervalMs: 60_000 },
  { queryKeys: ['wallet-transactions'], intervalMs: 60_000 },
  { queryKeys: ['token-allowances'], intervalMs: 120_000 },
];

let _appState: AppStateStatus = AppState.currentState;
let _isOnline = true;
let _subscription: { remove(): void } | null = null;

/**
 * Initialize background polling lifecycle.
 * Call once at app startup (e.g., in root layout).
 */
export function initPollingLifecycle(queryClient: QueryClient): () => void {
  _subscription = AppState.addEventListener('change', (nextState) => {
    const wasBg = _appState.match(/inactive|background/);
    _appState = nextState;

    if (wasBg && nextState === 'active') {
      // App foregrounded — invalidate all stale queries
      queryClient.invalidateQueries();
    }
  });

  return () => {
    _subscription?.remove();
    _subscription = null;
  };
}

/**
 * Set network status. Call from NetInfo listener.
 */
export function setOnlineStatus(online: boolean): void {
  _isOnline = online;
}

/**
 * Whether polling should be active.
 */
export function shouldPoll(): boolean {
  return _appState === 'active' && _isOnline;
}

/**
 * Get the refetch interval for a given query key.
 * Returns `false` when polling should be suspended.
 */
export function getRefetchInterval(queryKey: string): number | false {
  if (!shouldPoll()) return false;
  const config = DEFAULT_CONFIGS.find((c) => c.queryKeys.includes(queryKey));
  return config?.intervalMs ?? false;
}
```

**Step 2: Commit**

```bash
git add src/infrastructure/wallet/polling-service.ts
git commit -m "feat(polling): add AppState-aware background polling service"
```

---

### Task 6.2: Application — useBackgroundRefresh Hook

**Files:**
- Create: `src/application/hooks/use-background-refresh.ts`

**Step 1: Implement**

```ts
// src/application/hooks/use-background-refresh.ts
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Invalidates all queries when the app returns to the foreground.
 * Mount once in the root layout.
 */
export function useBackgroundRefresh() {
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        queryClient.invalidateQueries();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [queryClient]);
}
```

**Step 2: Commit**

```bash
git add src/application/hooks/use-background-refresh.ts
git commit -m "feat(hooks): add useBackgroundRefresh for foreground invalidation"
```

---

## Feature 7: Send Flow Hardening

### Task 7.1: Domain — Address Validation Utilities

**Files:**
- Create: `src/domain/wallet/value-objects/address-validator.ts`
- Test: `tests/unit/shared/address-validator.test.ts`

**Step 1: Write tests**

```ts
// tests/unit/shared/address-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateAddress } from '@domain/wallet/value-objects/address-validator';

describe('Address Validator', () => {
  it('validates EVM address', () => {
    expect(validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f6E321', 'evm').ok).toBe(true);
  });

  it('rejects short EVM address', () => {
    expect(validateAddress('0x742d35', 'evm').ok).toBe(false);
  });

  it('validates Solana address', () => {
    expect(validateAddress('7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', 'solana').ok).toBe(true);
  });

  it('validates Stellar address', () => {
    expect(validateAddress('GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DSZV', 'stellar').ok).toBe(true);
  });

  it('rejects empty address', () => {
    expect(validateAddress('', 'evm').ok).toBe(false);
  });
});
```

**Step 2: Implement**

```ts
// src/domain/wallet/value-objects/address-validator.ts
import type { Result } from '@domain/common/types';
import { success, failure } from '@domain/common/types';
import { ValidationError } from '@domain/common/errors/domain-error';
import type { ChainType } from '@domain/wallet/entities/wallet';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const STELLAR_RE = /^(G[A-Z2-7]{55}|M[A-Z2-7]{68})$/;
const SOLANA_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function validateAddress(
  address: string,
  chainType: ChainType,
): Result<string, ValidationError> {
  const trimmed = address.trim();

  if (trimmed.length === 0) {
    return failure(new ValidationError('Address is required', 'address'));
  }

  switch (chainType) {
    case 'evm':
      if (!EVM_RE.test(trimmed)) {
        return failure(new ValidationError('Invalid EVM address', 'address'));
      }
      break;
    case 'solana':
      if (!SOLANA_RE.test(trimmed)) {
        return failure(new ValidationError('Invalid Solana address', 'address'));
      }
      break;
    case 'stellar':
      if (!STELLAR_RE.test(trimmed)) {
        return failure(new ValidationError('Invalid Stellar address', 'address'));
      }
      break;
    case 'sui':
      // SUI addresses are 0x-prefixed hex, 64 chars after 0x
      if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
        return failure(new ValidationError('Invalid SUI address', 'address'));
      }
      break;
  }

  return success(trimmed);
}
```

**Step 3: Run tests**

```bash
npx vitest run tests/unit/shared/address-validator.test.ts --reporter=verbose
```

**Step 4: Commit**

```bash
git add src/domain/wallet/value-objects/address-validator.ts tests/unit/shared/address-validator.test.ts
git commit -m "feat(domain): add multi-chain address validation"
```

---

### Task 7.2: Application — Biometric Threshold Setting

**Files:**
- Modify: `src/application/stores/wallet-store.ts` (add biometric threshold field)

**Step 1: Add to the store**

Find the wallet store and add:

```ts
// Add to the store state interface:
biometricThresholdUsd: number; // 0 = always require biometric

// Add to the store actions:
setBiometricThreshold: (usd: number) => void;

// Implementation:
setBiometricThreshold: (usd) => set((state) => { state.biometricThresholdUsd = usd; }),
```

Default: `biometricThresholdUsd: 0` (always require).

**Step 2: Commit**

```bash
git add src/application/stores/wallet-store.ts
git commit -m "feat(store): add biometric threshold setting to wallet store"
```

---

### Task 7.3: Integration — Wire Polling into Root Layout

**Files:**
- Modify: `app/(app)/_layout.tsx`

**Step 1: Add the background refresh hook**

Import and call `useBackgroundRefresh()` inside the app layout component. This is a one-liner addition near the top of the component body.

```ts
import { useBackgroundRefresh } from '@application/hooks/use-background-refresh';

// Inside the component:
useBackgroundRefresh();
```

**Step 2: Commit**

```bash
git add app/(app)/_layout.tsx
git commit -m "feat(layout): wire background refresh polling into app layout"
```

---

## Verification

### Task V.1: Run Full Test Suite

```bash
npx vitest run --reporter=verbose
```

All tests must pass.

### Task V.2: TypeScript Type Check

```bash
npx tsc --noEmit
```

Zero errors required.

### Task V.3: Security Audit Checklist

Manually verify:
- [ ] `getEnv().COINGECKO_API_KEY` — only read, never logged
- [ ] `getEnv().MORALIS_API_KEY` — only read, never logged
- [ ] No `console.log` with sensitive data
- [ ] All transactions go through `WalletManager` biometric gate
- [ ] No files exceed 400 LOC

### Task V.4: Final Commit & Summary

```bash
git log --oneline -15
```

Review all commits for completeness.
