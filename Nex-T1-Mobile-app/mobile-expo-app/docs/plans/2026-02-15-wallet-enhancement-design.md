# Wallet Enhancement Design — NEX-T1 Mobile

**Date:** 2026-02-15
**Branch:** `feat/crossmint-wallet-onboarding`
**Approach:** Feature Module Bundles (each feature built end-to-end before the next)
**Backend strategy:** Mobile-only for MVP; direct RPC reads, deferred write-proxying
**Architecture:** Integrate into existing Clean Architecture (domain/application/infrastructure/presentation)
**Price feed:** CoinGecko API

---

## Build Order

1. Price Service (CoinGecko)
2. Gas Modeling (EVM EIP-1559 + Solana + Stellar)
3. NFT Modeling (EVM + Solana)
4. Staking Modeling (EVM + Solana)
5. Token Allowances (EVM only)
6. Background Polling (React Query + AppState)
7. Send Flow Hardening (biometric threshold + gas preview)

---

## 1. Price Service

### Files

| Layer | File | Purpose |
|-------|------|---------|
| Domain | `src/domain/market/entities/price.ts` | TokenPrice type, PriceError |
| Infrastructure | `src/infrastructure/api/price-api.ts` | CoinGecko batch fetcher |
| Application | `src/application/hooks/use-prices.ts` | React Query hook |

### Domain Types

```ts
interface TokenPrice {
  symbol: string;
  usdPrice: number;
  change24h: number;       // percentage
  lastUpdated: Timestamp;
}
```

### Implementation Notes

- Batch fetch via CoinGecko `/simple/price?ids=...&vs_currencies=usd&include_24hr_change=true`
- Cache in React Query with 30s stale time
- Rate-limit to 10 req/min (free tier)
- Fallback: return `undefined` price rather than failing the whole portfolio
- Token-to-CoinGecko-ID mapping maintained in a static lookup + dynamic resolution

---

## 2. Gas Modeling

### Files

| Layer | File | Purpose |
|-------|------|---------|
| Domain | `src/domain/wallet/entities/gas.ts` | Gas types per chain |
| Infrastructure | `src/infrastructure/wallet/gas-service.ts` | Multi-chain gas estimation |
| Application | `src/application/hooks/use-gas-fee-estimate.ts` | Enhanced hook (existing) |

### EVM — EIP-1559 Speed Tiers

```ts
type GasSpeed = 'slow' | 'standard' | 'fast';

interface EvmGasEstimate {
  speed: GasSpeed;
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedFeeWei: bigint;
  estimatedFeeNative: string;
  estimatedFeeUsd: number;
}
```

- Use `getFeeHistory` for last 5 blocks
- Priority fee percentiles: slow=25th, standard=50th, fast=75th
- Fee = (baseFee + priorityFee) * gasLimit
- Convert to USD via price service

### Solana

```ts
interface SolanaGasEstimate {
  lamportsPerSignature: number;
  signatureCount: number;
  totalLamports: number;
  feeSol: string;
  feeUsd: number;
}
```

- `connection.getFeeForMessage()` or fixed 5000 lamports/signature baseline

### Stellar

```ts
interface StellarGasEstimate {
  baseFeeStroops: number;
  operationCount: number;
  totalStroops: number;
  feeXlm: string;
  feeUsd: number;
}
```

- Fetch base fee from Horizon `/fee_stats`
- Deterministic: 100 stroops/op base

### Unified Interface

```ts
type GasEstimate =
  | { chain: 'evm'; tiers: [EvmGasEstimate, EvmGasEstimate, EvmGasEstimate] }
  | { chain: 'solana'; estimate: SolanaGasEstimate }
  | { chain: 'stellar'; estimate: StellarGasEstimate };
```

---

## 3. NFT Modeling

### Files

| Layer | File | Purpose |
|-------|------|---------|
| Domain | `src/domain/wallet/entities/nft.ts` | NFT types |
| Infrastructure | `src/infrastructure/wallet/nft-service.ts` | Multi-chain NFT fetcher |
| Application | `src/application/hooks/use-nfts.ts` | React Query hook |
| Presentation | `src/presentation/components/wallet/nft-gallery.tsx` | Gallery UI |

### Domain Types

```ts
interface NFT {
  tokenId: string;
  contractAddress: string;
  chain: ChainType;
  chainId: number | string;
  name: string;
  description?: string;
  imageUrl?: string;
  collectionName?: string;
  standard: 'ERC-721' | 'ERC-1155' | 'SPL' | 'Metaplex';
  attributes?: NFTAttribute[];
}

interface NFTAttribute {
  traitType: string;
  value: string;
}
```

### Implementation

- **EVM:** Moralis API `GET /v2.2/{address}/nft` (env: `MORALIS_API_KEY`). Fallback: on-chain ERC-721 `balanceOf` + `tokenURI`.
- **Solana:** Filter SPL accounts where `amount === 1 && decimals === 0`, fetch Metaplex metadata.
- **Stellar:** Not supported (no native NFT standard).

---

## 4. Staking Modeling

### Files

| Layer | File | Purpose |
|-------|------|---------|
| Domain | `src/domain/wallet/entities/staking.ts` | StakingPosition type |
| Infrastructure | `src/infrastructure/wallet/staking-service.ts` | Multi-chain staking reader |
| Application | `src/application/hooks/use-staking.ts` | React Query hook |
| Presentation | `src/presentation/components/wallet/staking-section.tsx` | Staking UI |

### Domain Types

```ts
interface StakingPosition {
  id: string;
  chain: ChainType;
  chainId: number | string;
  protocolName: string;
  stakedTokenSymbol: string;
  stakedTokenAddress: string;
  amountStaked: string;
  amountStakedFormatted: string;
  amountStakedUsd: number;
  rewardsAccrued: string;
  rewardsAccruedUsd: number;
  apy?: number;
  unlockDate?: Timestamp;
  canUnstake: boolean;
  canClaimRewards: boolean;
}
```

### Implementation

- **EVM:** Read-only for MVP. Check `balanceOf` for known LSTs (stETH, rETH, cbETH). Each detected balance = a staking position.
- **Solana:** Use `getStakeActivation()` + `getParsedProgramAccounts()` for native validator stakes.
- **Actions:** Build tx params locally → existing `WalletManager.sendTransaction()` (biometric gating already enforced).

---

## 5. Token Allowances (EVM Only)

### Files

| Layer | File | Purpose |
|-------|------|---------|
| Domain | `src/domain/wallet/entities/allowance.ts` | TokenAllowance type |
| Infrastructure | `src/infrastructure/wallet/allowance-service.ts` | Allowance reader + revoke builder |
| Application | `src/application/hooks/use-allowances.ts` | React Query hook |
| Presentation | `src/presentation/components/wallet/allowance-manager.tsx` | Allowance UI |

### Domain Types

```ts
interface TokenAllowance {
  id: string;
  chain: ChainType;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  spenderAddress: string;
  spenderLabel?: string;
  allowanceRaw: string;
  allowanceFormatted: string;
  isUnlimited: boolean;        // > 2^128
}
```

### Implementation

- For each ERC-20 in portfolio: call `allowance(owner, spender)` against known DEX routers + addresses from recent `Approval` event logs.
- **Revoke:** Build `approve(spender, 0)` tx → gas estimate → biometric → broadcast via WalletManager.
- **Increase:** Build `approve(spender, amount)` tx with same flow.

---

## 6. Background Polling

### Files

| Layer | File | Purpose |
|-------|------|---------|
| Infrastructure | `src/infrastructure/wallet/polling-service.ts` | Interval orchestration |
| Application | `src/application/hooks/use-background-refresh.ts` | AppState + React Query |

### Polling Intervals

| Data | Interval | Stale Time |
|------|----------|------------|
| Balances | 45s | 30s |
| Prices | 30s | 15s |
| Staking | 60s | 45s |
| Transactions | 60s | 30s |
| Allowances | 120s | 60s |

### Behavior

- **App foreground:** Immediate refetch of all stale queries
- **App background:** Pause all intervals (React Query `refetchInterval: false`)
- **Offline:** Skip polling (detect via `@react-native-community/netinfo`)
- **No `expo-task-manager`:** React Query's foreground polling + AppState is sufficient

---

## 7. Send Flow Hardening

### Enhancements (modify existing files)

| File | Change |
|------|--------|
| `app/(app)/wallet/send.tsx` | Full gas preview, total cost display |
| `src/application/hooks/use-wallet.ts` | Balance pre-check, address validation |
| `src/infrastructure/wallet/wallet-manager.ts` | Biometric threshold setting |
| `src/application/stores/wallet-store.ts` | Optimistic pending tx |

### Features

1. **Address validation per chain** — EVM regex, Solana base58 + curve, Stellar G-address
2. **Decimal precision** — `parseUnits`/`formatUnits` only, never floating point
3. **Balance check** — `amount + gasFee <= balance` before biometric
4. **Gas preview** — All 3 EVM speed tiers with USD. Default: "standard"
5. **Total cost display** — `amount + gas = total` in native + USD
6. **Biometric threshold** — Setting: "Require biometric above $X" (default: always)
7. **Optimistic UI** — Mark tx "pending" in store, reconcile on confirmation

---

## Security Rules

- No server API keys in Expo bundle
- All transactions go through `WalletManager` (biometric-gated)
- JWT stored in expo-secure-store only
- Validate all numeric inputs (no NaN, no negative, precision checks)
- Confirm gas before broadcast
- No private keys in JS memory beyond signing operation
- Rate-limit CoinGecko API calls
- Validate all addresses before allowing send

---

## File Size Constraint

All new files must be < 400 LOC. Split when approaching limit.

---

## Test Coverage Requirements

Each feature module must include tests for:
- Domain type validation
- Service logic (mocked RPC calls)
- Hook behavior (React Query caching/refetching)
- Error paths (network failure, invalid data)

---

## Verification Gates

Before marking complete:
1. All chains functional (EVM, Solana, Stellar)
2. Gas estimation correct per chain with USD conversion
3. NFTs displayed for EVM + Solana
4. Staking positions visible with APY + rewards
5. Allowances listed + revocable
6. Background polling stable (no infinite loops, no duplicate calls)
7. No secrets in bundle
8. Strong typing everywhere (no `any`)
9. No monolith files (> 400 LOC)
10. All tests passing
