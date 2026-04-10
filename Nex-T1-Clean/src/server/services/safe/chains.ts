// Domain: wallets (Safe)
// Responsibility: Safe chain configuration for provisioning + Tx Service access
// Depends on: process.env
// Notes: Keep this server-only; never expose secrets.

export type SafeChainConfig = {
  chainId: number;
  label: string;
  rpcUrl: string;
  txServiceUrl?: string;
};

import type { ApiAccessTier } from "@/server/security/api-key-utils";

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseChainIdList(raw?: string): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function getRpc(
  tier: ApiAccessTier | null | undefined, 
  premiumEnv: string, 
  standardEnv: string, 
  fallback: string
): string {
  if (tier === "pro" || tier === "ultra" || tier === "enterprise") {
    const premium = optionalEnv(premiumEnv);
    if (premium) return premium;
  }
  return optionalEnv(standardEnv) ?? fallback;
}

// Required target chains per spec.
// Base + Optimism + BNB use public RPC by default, but allow overrides for production.
// Custom networks (Hyperliquid EVM / Monad) require explicit RPC URL + chain ID.
export function getSafeTargetChains(tier?: ApiAccessTier | null): SafeChainConfig[] {
  const allowlist = parseChainIdList(optionalEnv("TARGET_CHAIN_IDS"));
  const include = (chainId: number) => allowlist.length === 0 || allowlist.includes(chainId);

  const baseRpc = getRpc(tier, "PREMIUM_RPC_URL_BASE", "BASE_RPC_URL", "https://mainnet.base.org");
  const opRpc = getRpc(tier, "PREMIUM_RPC_URL_OPTIMISM", "OPTIMISM_RPC_URL", "https://mainnet.optimism.io");
  const bnbRpc = getRpc(tier, "PREMIUM_RPC_URL_BNB", "BNB_RPC_URL", "https://bsc-dataseed.binance.org");
  const ethRpc = getRpc(tier, "PREMIUM_RPC_URL_ETHEREUM", "ETHEREUM_RPC_URL", "https://ethereum.publicnode.com");
  const arbRpc = getRpc(tier, "PREMIUM_RPC_URL_ARBITRUM", "ARBITRUM_RPC_URL", "https://arb1.arbitrum.io/rpc");
  const polygonRpc = getRpc(tier, "PREMIUM_RPC_URL_POLYGON", "POLYGON_RPC_URL", "https://polygon-rpc.com");
  const avalancheRpc = getRpc(tier, "PREMIUM_RPC_URL_AVALANCHE", "AVALANCHE_RPC_URL", "https://api.avax.network/ext/bc/C/rpc");
  const celoRpc = getRpc(tier, "PREMIUM_RPC_URL_CELO", "CELO_RPC_URL", "https://forno.celo.org");
  const unichainRpc = getRpc(tier, "PREMIUM_RPC_URL_UNICHAIN", "UNICHAIN_RPC_URL", "https://unichain-rpc.publicnode.com");

  const out: SafeChainConfig[] = [
    { chainId: 1, label: "Ethereum", rpcUrl: ethRpc, txServiceUrl: "https://safe-transaction-mainnet.safe.global" },
    { chainId: 8453, label: "Base", rpcUrl: baseRpc, txServiceUrl: "https://safe-transaction-base.safe.global" },
    { chainId: 10, label: "Optimism", rpcUrl: opRpc, txServiceUrl: "https://safe-transaction-optimism.safe.global" },
    { chainId: 42161, label: "Arbitrum", rpcUrl: arbRpc, txServiceUrl: "https://safe-transaction-arbitrum.safe.global" },
    { chainId: 43114, label: "Avalanche", rpcUrl: avalancheRpc, txServiceUrl: "https://safe-transaction-avalanche.safe.global" },
    { chainId: 42220, label: "Celo", rpcUrl: celoRpc, txServiceUrl: "https://safe-transaction-celo.safe.global" },
    { chainId: 56, label: "BNB Chain", rpcUrl: bnbRpc, txServiceUrl: "https://safe-transaction-bsc.safe.global" },
    { chainId: 137, label: "Polygon", rpcUrl: polygonRpc, txServiceUrl: "https://safe-transaction-polygon.safe.global" },
    { chainId: 130, label: "Unichain", rpcUrl: unichainRpc },
  ].filter((chain) => include(chain.chainId));

  const hyperChainId = Number(
    optionalEnv("HYPEREVM_CHAIN_ID") ?? "",
  );
  const hasHyper = Number.isFinite(hyperChainId) && hyperChainId > 0 && include(hyperChainId);
  if (hasHyper) {
    const premiumHyper = optionalEnv("PREMIUM_RPC_URL_HYPEREVM");
    const standardHyper = optionalEnv("HYPEREVM_RPC_URL");

    let selectedRpc = "";
    if ((tier === "pro" || tier === "ultra" || tier === "enterprise") && premiumHyper) {
      selectedRpc = premiumHyper;
    } else {
      selectedRpc = standardHyper ?? "";
    }

    if (!selectedRpc) {
      throw new Error("Missing required env var: HYPEREVM_RPC_URL");
    }
    out.push({
      chainId: hyperChainId,
      label: "Hyperliquid EVM",
      rpcUrl: selectedRpc,
      txServiceUrl: optionalEnv("TX_SERVICE_URL_HYPEREVM"),
    });
  }

  const monadChainId = Number(optionalEnv("MONAD_CHAIN_ID") ?? "");
  const hasMonad = Number.isFinite(monadChainId) && monadChainId > 0 && include(monadChainId);
  if (hasMonad) {
    const rpcUrl = getRpc(tier, "PREMIUM_RPC_URL_MONAD", "MONAD_RPC_URL", "");
    if (!rpcUrl) {
      throw new Error("Missing required env var: MONAD_RPC_URL");
    }
    out.push({
      chainId: monadChainId,
      label: "Monad",
      rpcUrl,
      txServiceUrl: optionalEnv("TX_SERVICE_URL_MONAD"),
    });
  }

  return out;
}
