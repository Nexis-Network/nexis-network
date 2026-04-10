// Domain: wallets (Safe)
// Responsibility: Build user-paid Safe activation transactions + confirm deployment.
// Depends on: Supabase admin, Safe Protocol Kit, viem
// Notes:
// - Activation is user-paid and only provides tx data (no signing).
// - Confirmation validates on-chain deployment + ownership before marking ready.

import Safe, { type SafeAccountConfig, type ContractNetworksConfig } from "@safe-global/protocol-kit";
import { createPublicClient, encodeFunctionData, http, type Address, isAddress } from "viem";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import { buildSafeModuleList, resolveSafeDeployments } from "@/server/services/safe/deployments";
import { assertUserOwnsSafeWallet } from "@/server/services/safe/ownership";
import { resolveOwnerSources } from "@/server/services/safe/signers";
import { derivePasskeySignerAddress } from "@/server/services/safe/passkeys";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";

const MODULE_SETUP_ABI = [
  {
    type: "function",
    name: "enableModules",
    stateMutability: "nonpayable",
    inputs: [{ name: "modules", type: "address[]" }],
    outputs: [],
  },
] as const;

const SAFE_OWNER_ABI = [
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

type OwnerKind = "eoa" | "passkey";

type OwnerResolution = {
  owners: Address[];
  ownerKinds: OwnerKind[];
};

export type SafeActivationTx = {
  chainId: number;
  safeAddress: Address;
  to: Address;
  data: `0x${string}`;
  value: string;
};

export type SafeActivationResponse =
  | { status: "ready"; safeAddress: Address }
  | { status: "activation_required"; activation: SafeActivationTx };

export type SafeActivationConfirm =
  | { status: "ready"; safeAddress: Address }
  | { status: "pending"; safeAddress: Address };

function toContractNetworks(chainId: number, deployments: ReturnType<typeof resolveSafeDeployments>): ContractNetworksConfig {
  return {
    [String(chainId)]: {
      safeSingletonAddress: deployments.safeSingleton,
      safeProxyFactoryAddress: deployments.proxyFactory,
    },
  };
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function normalizeOwnerKinds(value: UntypedJson): OwnerKind[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OwnerKind => item === "eoa" || item === "passkey");
}

function parseOwnersFromMetadata(metadata: Record<string, UntypedJson> | null | undefined): OwnerResolution | null {
  if (!metadata) return null;
  const rawOwners = Array.isArray(metadata.owners) ? metadata.owners : [];
  const owners = rawOwners
    .map((owner) => (typeof owner === "string" ? owner.trim() : ""))
    .filter((owner): owner is Address => Boolean(owner) && isAddress(owner));
  if (!owners.length) return null;
  return { owners, ownerKinds: normalizeOwnerKinds(metadata.ownerKinds) };
}

function resolveEnabledModules(metadata: Record<string, UntypedJson> | null | undefined): Address[] | null {
  const raw = Array.isArray(metadata?.enabledModules) ? metadata?.enabledModules : [];
  const modules = raw
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry): entry is Address => isNonZeroEVMAddress(entry));
  return modules.length ? modules : null;
}

function resolveThreshold(metadata: Record<string, UntypedJson> | null | undefined): number {
  const value = typeof metadata?.threshold === "number" ? metadata?.threshold : Number(metadata?.threshold ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function resolveSalt(metadata: Record<string, UntypedJson> | null | undefined): string | null {
  const salt = typeof metadata?.safeSalt === "string" ? metadata.safeSalt.trim() : "";
  return salt ? salt : null;
}

async function resolveOwnersFromSources(params: { userId: string; chainId: number; rpcUrl: string }): Promise<OwnerResolution> {
  const ownerSources = await resolveOwnerSources(params.userId);
  const owners: Address[] = [];
  const ownerKinds: OwnerKind[] = [];

  if (ownerSources.eoaOwner) {
    owners.push(ownerSources.eoaOwner);
    ownerKinds.push("eoa");
  }

  if (ownerSources.passkey) {
    const derived = await derivePasskeySignerAddress({
      chainId: params.chainId,
      rpcUrl: params.rpcUrl,
      publicKeyCose: fromBase64Url(ownerSources.passkey.publicKeyB64Url),
    });
    owners.push(derived.signerAddress);
    ownerKinds.push("passkey");
  }

  if (!owners.length) {
    throw new Error("no_owner_available");
  }

  return { owners, ownerKinds };
}

export async function buildSafeActivationPayload(params: {
  userId: string;
  chainId: number;
  safeAddress: string;
}): Promise<SafeActivationResponse> {
  const record = await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    requireReady: false,
  });

  if (record.status === "ready") {
    return { status: "ready", safeAddress: record.safeAddress };
  }

  const chain = getSafeTargetChains().find((c) => c.chainId === params.chainId);
  if (!chain) {
    throw new Error("unsupported_chain");
  }

  const metadata = record.metadata ?? {};
  const ownerFromMetadata = parseOwnersFromMetadata(metadata);
  const ownerResolution = ownerFromMetadata ?? await resolveOwnersFromSources({
    userId: params.userId,
    chainId: params.chainId,
    rpcUrl: chain.rpcUrl,
  });

  const safeSalt = resolveSalt(metadata);
  if (!safeSalt) {
    throw new Error("safe_salt_missing");
  }

  const threshold = resolveThreshold(metadata);

  const deployments = resolveSafeDeployments(params.chainId);
  const modules = resolveEnabledModules(metadata) ?? buildSafeModuleList(deployments);
  if (!modules.length) {
    throw new Error("safe_modules_missing");
  }

  const safeAccountConfig: SafeAccountConfig = {
    owners: ownerResolution.owners,
    threshold,
    to: deployments.moduleSetup,
    data: encodeFunctionData({
      abi: MODULE_SETUP_ABI,
      functionName: "enableModules",
      args: [modules],
    }),
    fallbackHandler: deployments.safe4337Module,
  };

  const predictedSafe = {
    safeAccountConfig,
    safeDeploymentConfig: { saltNonce: safeSalt },
  };

  const protocolKit = await Safe.init({
    provider: chain.rpcUrl,
    predictedSafe,
    contractNetworks: toContractNetworks(params.chainId, deployments),
  });

  const predicted = (await protocolKit.getAddress()) as Address;
  if (!isNonZeroEVMAddress(predicted)) {
    throw new Error("safe_address_invalid");
  }
  if (predicted.toLowerCase() !== record.safeAddress.toLowerCase()) {
    throw new Error("safe_address_mismatch");
  }

  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  return {
    status: "activation_required",
    activation: {
      chainId: params.chainId,
      safeAddress: record.safeAddress,
      to: deploymentTx.to as Address,
      data: deploymentTx.data as `0x${string}`,
      value: deploymentTx.value,
    },
  };
}

export async function confirmSafeActivation(params: {
  userId: string;
  chainId: number;
  safeAddress: string;
  txHash?: string | null;
}): Promise<SafeActivationConfirm> {
  const record = await assertUserOwnsSafeWallet({
    userId: params.userId,
    chainId: params.chainId,
    safeAddress: params.safeAddress,
    requireReady: false,
  });

  if (record.status === "ready") {
    return { status: "ready", safeAddress: record.safeAddress };
  }

  const chain = getSafeTargetChains().find((c) => c.chainId === params.chainId);
  if (!chain) {
    throw new Error("unsupported_chain");
  }

  const client = createPublicClient({ transport: http(chain.rpcUrl) });

  if (params.txHash) {
    try {
      await client.waitForTransactionReceipt({ hash: params.txHash as `0x${string}`, timeout: 60_000 });
    } catch {
      // Continue; we will still verify on-chain code below.
    }
  }

  const code = await client.getBytecode({ address: record.safeAddress });
  if (!code || code === "0x") {
    return { status: "pending", safeAddress: record.safeAddress };
  }

  const metadata = record.metadata ?? {};
  const ownerFromMetadata = parseOwnersFromMetadata(metadata);
  const ownerResolution = ownerFromMetadata ?? await resolveOwnersFromSources({
    userId: params.userId,
    chainId: params.chainId,
    rpcUrl: chain.rpcUrl,
  });

  if (ownerResolution.owners.length) {
    const owners = await client.readContract({
      address: record.safeAddress,
      abi: SAFE_OWNER_ABI,
      functionName: "getOwners",
    });
    const normalized = owners.map((o) => o.toLowerCase());
    const missing = ownerResolution.owners.filter((owner) => !normalized.includes(owner.toLowerCase()));
    if (missing.length) {
      throw new Error("safe_owner_mismatch");
    }
  }

  const deployments = resolveSafeDeployments(params.chainId);
  const modules = resolveEnabledModules(metadata) ?? buildSafeModuleList(deployments);
  const safeSalt = resolveSalt(metadata);

  const supabase = getSupabaseAdminClient();
  await supabase
    .from("wallet_accounts")
    .update({
      status: "ready",
      safe_address: record.safeAddress,
      address: record.safeAddress,
      metadata: {
        ...metadata,
        owners: ownerResolution.owners,
        ownerKinds: ownerResolution.ownerKinds,
        threshold: resolveThreshold(metadata),
        enabledModules: modules,
        safeSalt: safeSalt ?? metadata?.safeSalt ?? null,
        activationMode: metadata?.activationMode ?? "user",
      },
    })
    .eq("user_id", params.userId)
    .eq("chain_id", params.chainId)
    .eq("wallet_type", "safe");

  await invalidateUserWalletsCache(params.userId).catch(() => {});

  return { status: "ready", safeAddress: record.safeAddress };
}
