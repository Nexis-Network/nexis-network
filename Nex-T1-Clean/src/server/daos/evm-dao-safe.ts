import "server-only";

import crypto from "node:crypto";

import Safe from "@safe-global/protocol-kit";
import type {
  ContractNetworksConfig,
  SafeAccountConfig,
} from "@safe-global/protocol-kit";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  type Address,
  type Hex,
  isAddress,
} from "viem";

import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import {
  buildSafeModuleList,
  resolveSafeDeployments,
} from "@/server/services/safe/deployments";
import { derivePasskeySignerAddress } from "@/server/services/safe/passkeys";
import { predictSafeAddress } from "@/server/services/safe/predict";
import {
  ensureServerSigners,
  resolveOwnerSources,
} from "@/server/services/safe/signers";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";

type OwnerKind = "eoa" | "passkey";

type DaoSafeProvisionResult = {
  safeAddress: string;
  walletId: string;
  chainId: number;
};

type OwnerResolution = {
  owners: Address[];
  ownerKinds: OwnerKind[];
  passkeyCredentialId: string | null;
};

type JsonRecord = Record<string, UntypedJson>;

const MODULE_SETUP_ABI = [
  {
    type: "function",
    name: "enableModules",
    stateMutability: "nonpayable",
    inputs: [{ name: "modules", type: "address[]" }],
    outputs: [],
  },
] as const;

function createSaltNonce(): string {
  const bytes = crypto.randomBytes(16);
  return BigInt(`0x${bytes.toString("hex")}`).toString();
}

function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  return new Uint8Array(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
}

function getDeployerPrivateKey(): string {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return `0x${"11".repeat(32)}`;
    }
    throw new Error("Missing PRIVATE_KEY");
  }
  return pk;
}

function toContractNetworks(
  chainId: number,
  deployments: ReturnType<typeof resolveSafeDeployments>,
): ContractNetworksConfig {
  return {
    [String(chainId)]: {
      safeSingletonAddress: deployments.safeSingleton,
      safeProxyFactoryAddress: deployments.proxyFactory,
    },
  };
}

function normalizeOwnerKinds(value: UntypedJson): OwnerKind[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OwnerKind => item === "eoa" || item === "passkey");
}

function parseOwnersFromMetadata(
  metadata: JsonRecord | null | undefined,
): { owners: Address[]; ownerKinds: OwnerKind[] } | null {
  if (!metadata) return null;

  const owners = Array.isArray(metadata.owners)
    ? metadata.owners
        .map((owner) => (typeof owner === "string" ? owner.trim() : ""))
        .filter((owner): owner is Address => Boolean(owner) && isAddress(owner))
    : [];

  if (owners.length === 0) {
    return null;
  }

  owners.sort();

  return {
    owners,
    ownerKinds: normalizeOwnerKinds(metadata.ownerKinds),
  };
}

async function resolveDaoSafeOwners(options: {
  userId: string;
  chainId: number;
  rpcUrl: string;
  metadata?: JsonRecord | null;
}): Promise<OwnerResolution> {
  const fromMetadata = parseOwnersFromMetadata(options.metadata);
  if (fromMetadata) {
    return {
      owners: fromMetadata.owners,
      ownerKinds: fromMetadata.ownerKinds,
      passkeyCredentialId:
        typeof options.metadata?.passkeyCredentialId === "string"
          ? options.metadata.passkeyCredentialId
          : null,
    };
  }

  const ownerSources = await resolveOwnerSources(options.userId);
  const owners: Address[] = [];
  const ownerKinds: OwnerKind[] = [];

  if (ownerSources.eoaOwner) {
    owners.push(ownerSources.eoaOwner as Address);
    ownerKinds.push("eoa");
  }

  if (ownerSources.passkey) {
    try {
      const derived = await derivePasskeySignerAddress({
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        publicKeyCose: fromBase64Url(ownerSources.passkey.publicKeyB64Url),
      });
      owners.push(derived.signerAddress);
      ownerKinds.push("passkey");
    } catch {
      if (!ownerSources.eoaOwner) {
        throw new Error("No compatible owners found for DAO Safe");
      }
    }
  }

  owners.sort();

  if (owners.length === 0) {
    throw new Error("No compatible owners found for DAO Safe");
  }

  return {
    owners,
    ownerKinds,
    passkeyCredentialId: ownerSources.passkey?.credentialId ?? null,
  };
}

export async function provisionDaoSafeWallet(options: {
  userId: string;
  daoId: string;
  chainId: number;
  label: string;
}): Promise<DaoSafeProvisionResult> {
  await ensureServerSigners(options.userId);

  const supabase = getSupabaseAdminClient();
  const walletId = `dao_safe:${options.daoId}:${options.chainId}`;
  const chain = getSafeTargetChains().find(
    (candidate) => candidate.chainId === options.chainId,
  );

  if (!chain) {
    throw new Error(`Unsupported chainId for DAO Safe: ${options.chainId}`);
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("wallet_accounts")
    .select("id,safe_address,address,status,metadata")
    .eq("user_id", options.userId)
    .eq("wallet_id", walletId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingSafeAddress =
    typeof existingRow?.safe_address === "string" &&
    isNonZeroEVMAddress(existingRow.safe_address)
      ? existingRow.safe_address
      : typeof existingRow?.address === "string" &&
          isNonZeroEVMAddress(existingRow.address)
        ? existingRow.address
        : null;

  if (String(existingRow?.status ?? "") === "ready" && existingSafeAddress) {
    return {
      safeAddress: existingSafeAddress,
      walletId,
      chainId: options.chainId,
    };
  }

  const currentMetadata =
    existingRow?.metadata && typeof existingRow.metadata === "object"
      ? (existingRow.metadata as JsonRecord)
      : {};

  const ownerResolution = await resolveDaoSafeOwners({
    userId: options.userId,
    chainId: options.chainId,
    rpcUrl: chain.rpcUrl,
    metadata: currentMetadata,
  });
  const deployments = resolveSafeDeployments(options.chainId);
  const modules = buildSafeModuleList(deployments);
  const salt =
    typeof currentMetadata.safeSalt === "string" && currentMetadata.safeSalt.length > 0
      ? currentMetadata.safeSalt
      : createSaltNonce();

  const predictedSafeAddress = await predictSafeAddress({
    chainId: options.chainId,
    rpcUrl: chain.rpcUrl,
    owners: ownerResolution.owners,
    threshold: 1,
    salt,
    deployerPrivateKey: getDeployerPrivateKey(),
  });

  if (!isNonZeroEVMAddress(predictedSafeAddress)) {
    throw new Error("Predicted DAO Safe address invalid");
  }

  const metadata: JsonRecord = {
    ...currentMetadata,
    daoId: options.daoId,
    daoScoped: true,
    safeSalt: salt,
    owners: ownerResolution.owners,
    ownerKinds: ownerResolution.ownerKinds,
    threshold: 1,
    modules: {
      safe4337: deployments.safe4337Module,
      allowance: deployments.allowanceModule,
      recovery: deployments.recoveryModule,
    },
    enabledModules: modules,
    passkeyCredentialId: ownerResolution.passkeyCredentialId,
  };

  const { error: upsertError } = await supabase.from("wallet_accounts").upsert(
    {
      user_id: options.userId,
      wallet_id: walletId,
      address: predictedSafeAddress,
      chain_id: options.chainId,
      platform: "evm",
      wallet_type: "dao_safe",
      provider: "safe",
      label: options.label,
      safe_address: predictedSafeAddress,
      status: "provisioning",
      last_error: null,
      metadata,
    },
    {
      onConflict: "user_id,wallet_id",
    },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const safeAccountConfig: SafeAccountConfig = {
    owners: ownerResolution.owners,
    threshold: 1,
    to: deployments.moduleSetup,
    data: encodeFunctionData({
      abi: MODULE_SETUP_ABI,
      functionName: "enableModules",
      args: [modules],
    }),
    fallbackHandler: deployments.safe4337Module,
  };

  const protocolKit = await Safe.init({
    provider: chain.rpcUrl,
    signer: getDeployerPrivateKey(),
    predictedSafe: {
      safeAccountConfig,
      safeDeploymentConfig: { saltNonce: salt },
    },
    contractNetworks: toContractNetworks(options.chainId, deployments),
  });

  const safeAddress = (await protocolKit.getAddress()) as Address;
  if (!isNonZeroEVMAddress(safeAddress)) {
    throw new Error("safe_address_invalid");
  }

  const publicClient = createPublicClient({ transport: http(chain.rpcUrl) });
  const code = await publicClient.getBytecode({ address: safeAddress });

  if (!code || code === "0x") {
    const deploymentTx = await protocolKit.createSafeDeploymentTransaction();
    const externalSigner = (await protocolKit
      .getSafeProvider()
      .getExternalSigner()) as
      | {
          sendTransaction: (transaction: {
            chain: null;
            to: Address;
            value: bigint;
            data: Hex;
          }) => Promise<Hex>;
        }
      | null;

    if (!externalSigner) {
      throw new Error("Safe external signer unavailable");
    }

    const txHash = await externalSigner.sendTransaction({
      chain: null,
      to: deploymentTx.to as Address,
      value: BigInt(deploymentTx.value),
      data: deploymentTx.data as Hex,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  const { error: updateError } = await supabase
    .from("wallet_accounts")
    .update({
      address: safeAddress,
      safe_address: safeAddress,
      status: "ready",
      last_error: null,
      metadata,
      label: options.label,
    })
    .eq("user_id", options.userId)
    .eq("wallet_id", walletId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await Promise.resolve(invalidateUserWalletsCache(options.userId)).catch(() => {});

  return {
    safeAddress,
    walletId,
    chainId: options.chainId,
  };
}
