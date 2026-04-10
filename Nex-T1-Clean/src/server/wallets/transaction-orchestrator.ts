import { getNexAdminAccount } from "@/modules/wallets/nex/admin";
import { ALL_SUPPORTED_CHAINS } from "@/modules/wallets/nex/chains";
import { metrics } from "@/server/instrumentation/metrics";
import { redis } from "@/server/services/redis";

export type WalletProviderKind = "nex_in_app" | "walletconnect_external";

export type TransactionIntentKind =
  | "sign_message"
  | "sign_typed_data"
  | "approve_erc20"
  | "send_native"
  | "send_token"
  | "bridge"
  | "swap";

export type TransactionMode =
  | { kind: "automated"; agentId: string; auditTrailId?: string }
  | { kind: "manual"; approverUserId: string; approvalId: string };

export type ChainIdentifier = {
  chainId: number;
  network: string;
  layer: "L1" | "L2" | "alt";
};

export type SignatureIntent = {
  type: "signMessage" | "signTypedData";
  payload: string | Record<string, UntypedJson>;
};

export type ApprovalMetadata = {
  spender: string;
  token: string;
  amount: string;
};

export type BridgeMetadata = {
  destinationChainId: number;
  destinationAddress: string;
  router: "wormhole" | "relay" | "celer" | "layerzero";
  slippageBps?: number;
};

export type SwapMetadata = {
  protocol: "uniswap" | "pancakeswap" | "jupiter";
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
};

export type TransactionIntent = {
  id: string;
  createdAt: string;
  provider: WalletProviderKind;
  chain: ChainIdentifier;
  fromAddress: string;
  mode: TransactionMode;
  kind: TransactionIntentKind;
  signature?: SignatureIntent;
  approval?: ApprovalMetadata;
  bridge?: BridgeMetadata;
  swap?: SwapMetadata;
  transfer?: {
    type: "native" | "erc20";
    amount: string;
    tokenAddress?: string;
    to: Array<{ address: string; amount: string }>;
  };
  metadata?: Record<string, UntypedJson>;
};

export type TransactionExecutionResult = {
  intentId: string;
  provider: WalletProviderKind;
  transactionHash?: string;
  approvalHash?: string;
  swapHash?: string;
  bridgeTraceId?: string;
  signatures?: string[];
  state: "pending" | "submitted" | "confirmed" | "failed" | "blocked";
  error?: string;
  diagnostics?: Record<string, UntypedJson>;
};

type CachedSigner = {
  signerAddress: string;
  smartAccountAddress?: string;
  expiration: number;
};

const SIGNER_CACHE_TTL_SECONDS = 30;
const WALLET_EXECUTION_DISABLED_MESSAGE =
  "Wallet execution is disabled in this build. Use preview-only flows until centralized approval is available.";

async function cacheSigner(key: string, payload: CachedSigner): Promise<void> {
  await redis.set(key, JSON.stringify(payload), { ex: SIGNER_CACHE_TTL_SECONDS }).catch(() => {});
}

async function getCachedSigner(key: string): Promise<CachedSigner | null> {
  const cached = await redis.get<string>(key).catch(() => null);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as CachedSigner;
    if (typeof parsed.expiration === "number" && parsed.expiration > Date.now()) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveSigner(userId: string): Promise<CachedSigner | null> {
  const cacheKey = `wallet:signer:${userId}`;
  const cached = await getCachedSigner(cacheKey);
  if (cached) {
    metrics.cacheHit("wallet_transaction_signer");
    return cached;
  }

  metrics.cacheMiss("wallet_transaction_signer");

  const chains = ALL_SUPPORTED_CHAINS;
  if (!chains?.length) {
    return null;
  }

  try {
    const nexAdmin = await getNexAdminAccount();
    if (nexAdmin?.address) {
      const adminRecord: CachedSigner = {
        signerAddress: nexAdmin.address,
        smartAccountAddress: nexAdmin.address,
        expiration: Date.now() + SIGNER_CACHE_TTL_SECONDS * 1000,
      };
      await cacheSigner(cacheKey, adminRecord);
      return adminRecord;
    }
  } catch {
    // ignore when Nex admin wallet is not configured
  }

  return null;
}

export class WalletTransactionOrchestrator {
  async execute(intent: TransactionIntent): Promise<TransactionExecutionResult> {
    return this.blockExecution(intent);
  }

  private blockExecution(intent: TransactionIntent): TransactionExecutionResult {
    return {
      intentId: intent.id,
      provider: intent.provider,
      state: "blocked",
      error: WALLET_EXECUTION_DISABLED_MESSAGE,
      diagnostics: {
        blocked: true,
        reason: WALLET_EXECUTION_DISABLED_MESSAGE,
        intentKind: intent.kind,
        mode: intent.mode.kind,
      },
    };
  }

  async resolveSigner(userId: string): Promise<CachedSigner | null> {
    return resolveSigner(userId);
  }
}

export const walletTransactionOrchestrator = new WalletTransactionOrchestrator();
