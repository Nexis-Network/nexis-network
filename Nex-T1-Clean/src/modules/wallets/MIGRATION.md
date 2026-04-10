# Wallet Module Migration Guide

## Overview

The wallet system has been migrated from **Thirdweb** to the new **Nex wallet module** which provides:

- ✅ True non-custodial wallets (private keys stored client-side)
- ✅ ERC-4337 Account Abstraction via Barz/Trust smart accounts
- ✅ User-paid gas (no paymaster dependency)
- ✅ Session keys for AI agent delegation
- ✅ Unified EVM + Solana wallet management

## Quick Migration Reference

### Import Changes

| Old (Thirdweb)                                                   | New (Nex)                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `import { useActiveAccount } from "thirdweb/react"`              | `import { useNexWallet } from "@/modules/wallets/nex"`          |
| `import type { Chain } from "thirdweb"`                          | `import type { Chain } from "viem"`                             |
| `import { getThirdwebClient } from "@/modules/wallets/thirdweb"` | `import { createNexPublicClient } from "@/modules/wallets/nex"` |
| `import { createSmartWallet } from "@/modules/wallets/thirdweb"` | `import { createNexSmartAccount } from "@/modules/wallets/nex"` |

### Hook Migrations

```typescript
// OLD: Thirdweb
import { useActiveAccount } from "thirdweb/react";
const account = useActiveAccount();
const address = account?.address;

// NEW: Nex
import { useNexWallet } from "@/modules/wallets/nex";
const { evmAccount, isUnlocked } = useNexWallet();
const address = evmAccount?.address;
```

### Smart Account Creation

```typescript
// OLD: Thirdweb
import {
  createSmartWallet,
  connectSmartWallet,
} from "@/modules/wallets/thirdweb";
const wallet = createSmartWallet({ chain, sponsorGas: true });
const account = await connectSmartWallet(personalAccount, config);

// NEW: Nex (user-paid gas, no paymaster)
import { createNexSmartAccount } from "@/modules/wallets/nex";
import { privateKeyToAccount } from "viem/accounts";

const { account, address } = await createNexSmartAccount({
  owner: privateKeyToAccount(privateKey),
  chainId: 8453, // Base
});
```

### Balance Fetching

```typescript
// OLD: Thirdweb
import { useThirdwebNativeBalance } from "@/lib/hooks/balance/use-thirdweb-native-balance";
const { balance } = useThirdwebNativeBalance({ client, chain, address });

// NEW: Nex
import { useNexBalance } from "@/modules/wallets/nex/hooks";
const { evmBalances, solanaMainnet, solanaDevnet } = useNexBalance();
```

### API Routes

| Old Route                                       | New Route                                  |
| ----------------------------------------------- | ------------------------------------------ |
| `/api/thirdweb/evm/wallet/[address]/summary`    | `/api/nex/evm/wallet/[address]/summary`    |
| `/api/thirdweb/solana/wallet/[address]/summary` | `/api/nex/solana/wallet/[address]/summary` |
| `/api/thirdweb/solana/wallets`                  | Use client-side wallet generation          |
| `/api/thirdweb/solana/send`                     | Use client-side transaction signing        |

### Chain Configuration

```typescript
// OLD: Thirdweb chains
import {
  getThirdwebChains,
  findThirdwebChainById,
} from "@/modules/wallets/thirdweb";

// NEW: Nex chains (uses viem chains)
import {
  ALL_SUPPORTED_CHAINS,
  getViemChain,
} from "@/modules/wallets/nex/chains";
```

## Session Keys (New Feature)

The Nex module includes session key support for AI agent delegation:

```typescript
import { useSessionKeys } from "@/modules/wallets/nex/hooks";

const { sessionKeys, grantSessionKey, revokeSessionKey } = useSessionKeys();

// Grant agent access
await grantSessionKey({
  walletAddress: "0x...",
  chainId: 8453,
  permissions: {
    spendingLimit: "0.1", // ETH
    contractWhitelist: ["0x..."],
    validUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  },
});
```

## Files Requiring Manual Migration

The following files still import from thirdweb and need to be updated:

### High Priority (Core Functionality)

- `src/components/ui/eth-balance-display.tsx`
- `src/lib/hooks/balance/use-evm-chain-balance.ts`
- `src/lib/hooks/balance/use-thirdweb-native-balance.ts`
- `src/lib/hooks/thirdweb/use-smart-wallet.ts`

### Medium Priority (Auth Flow)

- `src/lib/auth/login-controller-core.ts`
- `src/lib/auth/wallet-auth-service.ts`
- `src/components/auth/login/wallet-config.tsx`
- `src/components/auth/login/types.ts`

### Lower Priority (UI Components)

- `src/components/app-header/profile-menu/profile-menu-content.tsx`
- `src/components/app-header/profile-menu/wallet-section.tsx`
- `src/components/app-header/profile-menu/network-section.tsx`
- `src/components/settings/wallets/in-app-wallet-export-dialog.tsx`
- `src/components/settings/linked-profiles-card.tsx`
- `src/components/settings/LinkWalletPanel.tsx`
- `src/components/build/web3-deploy-modal.tsx`

## Database Changes

The migration adds new tables and columns:

### Updated Tables

- `user_wallets` - Added columns for smart account metadata

### New Tables

- `wallet_session_keys` - Stores agent session key permissions
- `wallet_session_key_audit` - Audit log for session key events

Run the migration:

```bash
supabase migration up
```

## Environment Variables

Add to your `.env.local`:

```bash
# Pimlico Bundler (required for EVM AA)
PIMLICO_API_KEY=pim_your_api_key
NEXT_PUBLIC_PIMLICO_API_KEY=pim_your_api_key

# Enable Nex AA
ENABLE_NEX_AA=true
NEXT_PUBLIC_ENABLE_NEX_AA=true

# EntryPoint version (default: 0.7)
NEX_ENTRY_POINT_VERSION=0.7
```

## Testing Checklist

- [ ] EVM smart account creation works
- [ ] Solana wallet generation works (client-side)
- [ ] Native balance display shows correctly
- [ ] Session key grant/revoke works
- [ ] AI agent can execute within session key limits
- [ ] Wallet export works for both EVM and Solana
- [x] Server-side Admin Wallet migrated to Nex (Barz)

### Server-Side Admin Wallet

The admin/orchestrator wallet has been migrated from `thirdweb/client.ts` to `nex/admin.ts`.
It uses `getNexAdminAccount(chainId)` which instantiates a smart account for the admin private key.

**Env Var Changes**:

- Use `NEX_ADMIN_PRIVATE_KEY` for the server-side admin key.
