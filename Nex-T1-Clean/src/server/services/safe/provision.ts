// Domain: wallets (Safe)
// Responsibility: Idempotent Safe wallet provisioning per user + chain.
// Depends on: Supabase admin, Redis (locking), Safe Protocol Kit, Safe deployments, server signers.
// Notes:
// - User keys are NOT created server-side; user owner must be registered via challenge flow first.
// - Safe is deployed with Safe4337 + Allowance modules enabled during setup.

import Safe from "@safe-global/protocol-kit";
import type { SafeAccountConfig, ContractNetworksConfig } from "@safe-global/protocol-kit";
import crypto from "crypto";
import { createPublicClient, encodeFunctionData, http, type Address, isAddress } from "viem";

import { redis, isRedisConfigured } from "@/server/services/redis";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getSafeTargetChains } from "./chains";
import { buildSafeModuleList, resolveSafeDeployments } from "./deployments";
import { ensureServerSigners, resolveOwnerSources, type OwnerSources } from "./signers";
import { addSeconds, computeBackoffSeconds, shouldAttemptProvisioning, type SafeProvisionStatus } from "./retry";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import { derivePasskeySignerAddress } from "./passkeys";
import { provisionLogger } from "@/server/logging/logger";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";

const LOCK_TTL_SECONDS = 45;
const MAX_PROVISION_ATTEMPTS = Number(process.env.PROVISION_MAX_ATTEMPTS ?? 5);
const BACKOFF_BASE_SECONDS = Number(process.env.PROVISION_BACKOFF_BASE_SECONDS ?? 30);
const BACKOFF_MAX_SECONDS = Number(process.env.PROVISION_BACKOFF_MAX_SECONDS ?? 3600);
const ACTIVATE_ON_FIRST_TX = process.env.ACTIVATE_ON_FIRST_TX?.trim().toLowerCase() === "true";
const HAS_DEPLOYER_KEY = Boolean(process.env.PRIVATE_KEY?.trim());
const SERVER_PROVISIONING_ENABLED = !ACTIVATE_ON_FIRST_TX && HAS_DEPLOYER_KEY;

const MODULE_SETUP_ABI = [
  {
    type: "function",
    name: "enableModules",
    stateMutability: "nonpayable",
    inputs: [{ name: "modules", type: "address[]" }],
    outputs: [],
  },
] as const;

type OwnerKind = "eoa" | "passkey";

type OwnerResolution = {
  owners: Address[];
  ownerKinds: OwnerKind[];
  passkeySigner?: Address | null;
};

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function createSaltNonce(): string {
  const bytes = crypto.randomBytes(16);
  return BigInt(`0x${bytes.toString("hex")}`).toString();
}

function normalizeOwnerKinds(value: UntypedJson): OwnerKind[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OwnerKind => item === "eoa" || item === "passkey");
}

function parseOwnersFromMetadata(metadata: Record<string, UntypedJson> | null | undefined): { owners: Address[]; ownerKinds: OwnerKind[] } | null {
  if (!metadata) return null;
  const rawOwners = Array.isArray(metadata.owners) ? metadata.owners : [];
  const owners = rawOwners
    .map((owner) => (typeof owner === "string" ? owner.trim() : ""))
    .filter((owner): owner is Address => Boolean(owner) && isAddress(owner));
  if (!owners.length) return null;
  return { owners, ownerKinds: normalizeOwnerKinds(metadata.ownerKinds) };
}

async function resolveOwnersForChain(params: {
  ownerSources: OwnerSources;
  chainId: number;
  rpcUrl: string;
  metadata?: Record<string, UntypedJson> | null;
}): Promise<OwnerResolution> {
  const fromMetadata = parseOwnersFromMetadata(params.metadata);
  if (fromMetadata) {
    return { owners: fromMetadata.owners, ownerKinds: fromMetadata.ownerKinds };
  }

  const owners: Address[] = [];
  const ownerKinds: OwnerKind[] = [];

  if (params.ownerSources.eoaOwner) {
    owners.push(params.ownerSources.eoaOwner);
    ownerKinds.push("eoa");
  }

  if (params.ownerSources.passkey) {
    try {
      const derived = await derivePasskeySignerAddress({
        chainId: params.chainId,
        rpcUrl: params.rpcUrl,
        publicKeyCose: fromBase64Url(params.ownerSources.passkey.publicKeyB64Url),
      });
      owners.push(derived.signerAddress);
      ownerKinds.push("passkey");
      return { owners, ownerKinds, passkeySigner: derived.signerAddress };
    } catch {
      if (!params.ownerSources.eoaOwner) {
        return { owners: [], ownerKinds: [] };
      }
    }
  }

  // Sort owners to ensure deterministic order (important for Safe address prediction)
  owners.sort();

  return { owners, ownerKinds };
}

function getDeployerPrivateKey(): string {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) throw new Error("Missing PRIVATE_KEY");
  return pk;
}

function toContractNetworks(chainId: number, deployments: ReturnType<typeof resolveSafeDeployments>): ContractNetworksConfig {
  return {
    [String(chainId)]: {
      safeSingletonAddress: deployments.safeSingleton,
      safeProxyFactoryAddress: deployments.proxyFactory,
    },
  };
}

export async function provisionSafeWallet(userId: string, chainId: number, email?: string | null) {
  const lockKey = `safe_provision:${userId}:${chainId}`;
  if (isRedisConfigured) {
    const acquired = await redis.trySetNx(lockKey, "1", LOCK_TTL_SECONDS);
    if (!acquired) {
      throw new Error("Provisioning already in progress for this chain");
    }
  }

  try {
    const supabase = getSupabaseAdminClient();
    const now = new Date();

    // 1. Ensure basics
    await ensureServerSigners(userId);
    const ownerSources = await resolveOwnerSources(userId);
    const hasOwner = Boolean(ownerSources.eoaOwner || ownerSources.passkey);
    if (!hasOwner) throw new Error("No owner sources available (connect EOA or create passkey first)");

    // 2. Ensure row exists for this chain
    await ensureWalletAccountRows(userId, ownerSources, [chainId]);

    // 3. Get current state
    const { data: row } = await supabase
      .from("wallet_accounts")
      .select("id,status,safe_address,attempt_count,next_attempt_at,first_attempt_at,metadata")
      .eq("user_id", userId)
      .eq("chain_id", chainId)
      .eq("wallet_type", "safe")
      .single();

    if (!row) throw new Error("Failed to initialize wallet record");

    const status = String(row.status ?? "pending") as SafeProvisionStatus;
    if (status === "ready") return; // Already done

    // Manual creation = force attempt usually, but let's respect retry headers if very recent? 
    // Actually for manual trigger, we usually want to bypass backoff if it's not currently "provisioning".
    // But to be safe, let's use standard logic or just force it.
    // For "Create Wallet" button, we expect it to start NOW.

    const attemptCount = typeof row.attempt_count === "number" ? row.attempt_count : 0;
    const nextAttemptNumber = attemptCount + 1;

    // Deterministic salt
    const currentMetadata = (row.metadata as Record<string, UntypedJson>) || {};
    let salt = typeof currentMetadata.safeSalt === "string" && currentMetadata.safeSalt ? currentMetadata.safeSalt : "";
    if (!salt) {
      salt = createSaltNonce(); // Should have been created by ensureWalletAccountRows, but fallback
    }

    const chain = getSafeTargetChains().find(c => c.chainId === chainId);
    if (!chain) throw new Error("Unsupported chain");

    const ownerResolution = await resolveOwnersForChain({
      ownerSources,
      chainId,
      rpcUrl: chain.rpcUrl,
      metadata: currentMetadata,
    });

    if (!ownerResolution.owners.length) {
      throw new Error("No compatible owners found for this chain");
    }

    const nextMetadata = {
      ...currentMetadata,
      safeSalt: salt,
      owners: ownerResolution.owners,
      ownerKinds: ownerResolution.ownerKinds.length ? ownerResolution.ownerKinds : normalizeOwnerKinds(currentMetadata.ownerKinds),
      passkeyCredentialId: ownerSources.passkey?.credentialId ?? null,
    };

    await supabase
      .from("wallet_accounts")
      .update({
        status: "provisioning",
        last_error: null,
        attempt_count: nextAttemptNumber,
        first_attempt_at: row.first_attempt_at ?? now.toISOString(),
        last_attempt_at: now.toISOString(),
        next_attempt_at: null,
        metadata: nextMetadata,
      })
      .eq("id", row.id);

    await provisionChain({
      userId,
      email: email ?? null,
      chainId,
      rpcUrl: chain.rpcUrl,
      owners: ownerResolution.owners,
      ownerKinds: ownerResolution.ownerKinds,
      salt,
    });

  } finally {
    if (isRedisConfigured) {
      await redis.del(lockKey).catch(() => {});
    }
    await invalidateUserWalletsCache(userId).catch(() => {});
  }
}

export async function provisionSafeWalletsForUser(userId: string, email?: string | null) {
  const lockKey = `safe_provision:${userId}`;
  if (isRedisConfigured) {
    const acquired = await redis.trySetNx(lockKey, "1", LOCK_TTL_SECONDS);
    if (!acquired) return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const now = new Date();

    // Ensure server-managed allowance delegate exists (used for Allowance module execution).
    await ensureServerSigners(userId);

    // Load user owner sources (EOA + passkey if available).
    // We do NOT auto-create keys here to preserve non-custody guarantees.
    const ownerSources = await resolveOwnerSources(userId);
    const hasOwner = Boolean(ownerSources.eoaOwner || ownerSources.passkey);

    if (!hasOwner) {
      await ensureWalletAccountRows(userId, ownerSources);
      return;
    }

    // Ensure wallet account rows exist for both Safe AND EoA.
    await ensureWalletAccountRows(userId, ownerSources);

    if (!SERVER_PROVISIONING_ENABLED) {
      return;
    }

    // Mark EoA accounts as ready immediately (since they don't need deployment)
    // We do this here to ensure the UI sees them as available immediately after sign-up.
    // Note: We only do this once per user generally.
    const chains = getSafeTargetChains();
    if (ownerSources.eoaOwner) {
      for (const chain of chains) {
        await supabase
          .from("wallet_accounts")
          .update({
            status: "ready",
            address: ownerSources.eoaOwner,
            metadata: { label: `EoA - ${chain.label}`, isCustodial: false },
          })
          .eq("user_id", userId)
          .eq("chain_id", chain.chainId)
          .eq("wallet_type", "eoa");
      }
    }

    // Pull current safe wallet account state.
    const { data: accountRows } = await supabase
      .from("wallet_accounts")
      .select("id,chain_id,status,safe_address,attempt_count,next_attempt_at,first_attempt_at,metadata")
      .eq("user_id", userId)
      .eq("wallet_type", "safe");

    const byChain = new Map<number, UntypedJson>();
    (accountRows ?? []).forEach((row) => {
      if (typeof row?.chain_id === "number") byChain.set(row.chain_id, row);
    });

    for (const chain of chains) {
      const row = byChain.get(chain.chainId);
      if (!row) continue;
      const status = String(row.status ?? "pending") as SafeProvisionStatus;
      const attemptCount = typeof row.attempt_count === "number" ? row.attempt_count : 0;
      const nextAttemptAt =
        typeof row.next_attempt_at === "string" ? new Date(row.next_attempt_at) : (row.next_attempt_at instanceof Date ? row.next_attempt_at : null);

      const decision = shouldAttemptProvisioning({
        status,
        nextAttemptAt,
        attemptCount,
        maxAttempts: MAX_PROVISION_ATTEMPTS,
        now,
      });

      if (decision.action === "skip") {
        continue;
      }

      const nextAttemptNumber = attemptCount + 1;
      
      // Ensure we have a deterministic salt for this wallet (idempotency)
      const currentMetadata = (row.metadata as Record<string, UntypedJson>) || {};
      let salt = typeof currentMetadata.safeSalt === "string" && currentMetadata.safeSalt ? currentMetadata.safeSalt : "";
      if (!salt) {
        salt = createSaltNonce();
      }

      const ownerResolution = await resolveOwnersForChain({
        ownerSources,
        chainId: chain.chainId,
        rpcUrl: chain.rpcUrl,
        metadata: currentMetadata,
      });

      if (!ownerResolution.owners.length) {
        await supabase
          .from("wallet_accounts")
          .update({
            status: "pending",
            last_error: "no_owner_available",
          })
          .eq("user_id", userId)
          .eq("chain_id", chain.chainId)
          .eq("wallet_type", "safe");
        continue;
      }

      const nextMetadata = {
        ...currentMetadata,
        safeSalt: salt,
        owners: ownerResolution.owners,
        ownerKinds: ownerResolution.ownerKinds.length ? ownerResolution.ownerKinds : normalizeOwnerKinds(currentMetadata.ownerKinds),
        passkeyCredentialId: ownerSources.passkey?.credentialId ?? null,
      };

      // Mark provisioning + attempt bookkeeping (best-effort; don't block provisioning on bookkeeping errors).
      await supabase
        .from("wallet_accounts")
        .update({
          status: "provisioning",
          last_error: null,
          attempt_count: nextAttemptNumber,
          first_attempt_at: row.first_attempt_at ?? now.toISOString(),
          last_attempt_at: now.toISOString(),
          next_attempt_at: null,
          dead_lettered_at: null,
          metadata: nextMetadata,
        })
        .eq("user_id", userId)
        .eq("chain_id", chain.chainId)
        .eq("wallet_type", "safe");

      await provisionChain({
        userId,
        email: email ?? null,
        chainId: chain.chainId,
        rpcUrl: chain.rpcUrl,
        owners: ownerResolution.owners,
        ownerKinds: ownerResolution.ownerKinds,
        salt,
      }).catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        const exhausted = nextAttemptNumber >= MAX_PROVISION_ATTEMPTS;
        if (exhausted) {
          await supabase
            .from("wallet_accounts")
            .update({
              status: "dead",
              last_error: message,
              dead_lettered_at: new Date().toISOString(),
              next_attempt_at: null,
            })
            .eq("user_id", userId)
            .eq("chain_id", chain.chainId)
            .eq("wallet_type", "safe");
          return;
        }

        const delaySeconds = computeBackoffSeconds({
          attemptNumber: nextAttemptNumber,
          baseSeconds: BACKOFF_BASE_SECONDS,
          maxSeconds: BACKOFF_MAX_SECONDS,
          jitterRatio: 0.2,
          random: () => Math.random(),
        });
        const scheduledAt = addSeconds(new Date(), delaySeconds);

        await supabase
          .from("wallet_accounts")
          .update({
            status: "retry_scheduled",
            last_error: message,
            next_attempt_at: scheduledAt.toISOString(),
          })
          .eq("user_id", userId)
          .eq("chain_id", chain.chainId)
          .eq("wallet_type", "safe");
      });
    }
  } finally {
    if (isRedisConfigured) {
      await redis.del(lockKey).catch(() => {});
    }
    // Invalidate user wallet cache so UI picks up new/provisioning wallets immediately
    await invalidateUserWalletsCache(userId).catch(() => {});
  }
}

async function resolveUserStableSalt(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("wallet_accounts")
    .select("metadata")
    .eq("user_id", userId)
    .eq("wallet_type", "safe")
    .not("metadata", "is", null)
    .limit(1);

  if (data?.[0]?.metadata) {
    const meta = data[0].metadata as Record<string, UntypedJson>;
    if (typeof meta.safeSalt === "string" && meta.safeSalt) {
      return meta.safeSalt;
    }
  }
  return null;
}

export async function ensureWalletAccountRows(userId: string, ownerSources: OwnerSources, limitChainIds?: number[]) {
  const supabase = getSupabaseAdminClient();
  let chains = getSafeTargetChains();
  if (limitChainIds?.length) {
    chains = chains.filter(c => limitChainIds.includes(c.chainId));
  }
  const { data: existingRows } = await supabase
    .from("wallet_accounts")
    .select("chain_id,wallet_type")
    .eq("user_id", userId)
    .in("wallet_type", ["safe", "eoa"]);

  const existingChainIds = new Set<string>();
  (existingRows ?? []).forEach((row) => {
    if (typeof row?.chain_id === "number") existingChainIds.add(`${row.wallet_type}:${row.chain_id}`);
  });

  // EoA Account Rows
  if (ownerSources.eoaOwner) {
    const eoaToInsert = chains
      .filter((chain) => !existingChainIds.has(`eoa:${chain.chainId}`))
      .map((chain) => ({
        user_id: userId,
        wallet_id: `eoa:${chain.chainId}`,
        address: ownerSources.eoaOwner,
        chain_id: chain.chainId,
        platform: "evm",
        wallet_type: "eoa",
        provider: "embedded",
        safe_address: null,
        status: "ready", // EoA is always ready if we have the address
        last_error: null,
        metadata: { label: `EoA - ${chain.label}`, isCustodial: false },
      }));

    if (eoaToInsert.length) {
      await supabase.from("wallet_accounts").insert(eoaToInsert);
    }
  }

  // Safe Account Rows (require a signer to predict deterministic address).
  if (!ownerSources.eoaOwner && !ownerSources.passkey) {
    // No signer yet -> do not create pending rows.
    return;
  }

  const { predictSafeAddress } = await import("./predict");
  const deployerPrivateKey = process.env.PRIVATE_KEY?.trim() ?? null;

  const missingSafeChains = chains.filter((chain) => !existingChainIds.has(`safe:${chain.chainId}`));

  if (missingSafeChains.length === 0) return;

  provisionLogger.info({ userId, count: missingSafeChains.length }, "Predicting Safe addresses for new chains");

  // REUSE SALT for deterministic addressing
  const stableSalt = await resolveUserStableSalt(userId);
  const saltForBatch = stableSalt ?? createSaltNonce();

  const toInsert = await Promise.all(
    missingSafeChains.map(async (chain) => {
      const salt = saltForBatch;

      const ownerResolution = await resolveOwnersForChain({
        ownerSources,
        chainId: chain.chainId,
        rpcUrl: chain.rpcUrl,
      });

      if (!ownerResolution.owners.length) {
        return null;
      }

      let safeAddress: string | null = null;
      try {
        safeAddress = await predictSafeAddress({
          chainId: chain.chainId,
          rpcUrl: chain.rpcUrl,
          owners: ownerResolution.owners,
          threshold: 1,
          salt,
          deployerPrivateKey: deployerPrivateKey ?? undefined,
        });
      } catch (e) {
        provisionLogger.error({ chainId: chain.chainId, error: e }, "Failed to predict Safe address");
        return null;
      }

      if (!safeAddress || !isNonZeroEVMAddress(safeAddress)) {
        provisionLogger.error({ chainId: chain.chainId, safeAddress }, "Predicted Safe address invalid");
        return null;
      }

      const deployments = resolveSafeDeployments(chain.chainId);
      const modules = buildSafeModuleList(deployments);

      return {
        user_id: userId,
        wallet_id: `safe:${chain.chainId}`,
        address: safeAddress, // THE REAL ADDRESS
        chain_id: chain.chainId,
        platform: "evm",
        wallet_type: "safe",
        provider: "safe",
        safe_address: safeAddress,
        status: "pending", // Pending deployment, but address is known
        last_error: null,
        metadata: {
          label: chain.label,
          safeSalt: salt,
          owners: ownerResolution.owners,
          ownerKinds: ownerResolution.ownerKinds,
          threshold: 1,
          activationMode: SERVER_PROVISIONING_ENABLED ? "server" : "user",
          modules: {
            safe4337: deployments.safe4337Module,
            allowance: deployments.allowanceModule,
            recovery: deployments.recoveryModule,
          },
          enabledModules: modules,
          passkeyCredentialId: ownerSources.passkey?.credentialId ?? null,
        },
      };
    }),
  );

  const validInserts = toInsert.filter((r): r is NonNullable<typeof r> => r !== null);

  // Insert Safe accounts
  if (validInserts.length) {
    const { error } = await supabase.from("wallet_accounts").insert(validInserts);
    if (error) {
      provisionLogger.error({ userId, error }, "Failed to insert predicted Safe accounts");
    } else {
      provisionLogger.info({ userId, count: validInserts.length }, "Inserted predicted Safe accounts");
    }
  }

  // Ensure default agent_policies rows exist too.
  const policies = chains.map((chain) => ({
    user_id: userId,
    chain_id: chain.chainId,
    enabled: true,
    reset_interval_seconds: 86400,
    policy: { tokens: [], limits: [] },
  }));
  await supabase.from("agent_policies").upsert(policies, { onConflict: "user_id,chain_id" });
}

async function provisionChain(opts: {
  userId: string;
  email: string | null;
  chainId: number;
  rpcUrl: string;
  owners: Address[];
  ownerKinds: OwnerKind[];
  salt: string;
}) {
  const supabase = getSupabaseAdminClient();

  await supabase
    .from("wallet_accounts")
    .update({ status: "provisioning", last_error: null })
    .eq("user_id", opts.userId)
    .eq("chain_id", opts.chainId)
    .eq("wallet_type", "safe");

  const deployments = resolveSafeDeployments(opts.chainId);
  const contractNetworks = toContractNetworks(opts.chainId, deployments);

  const modules = buildSafeModuleList(deployments);

  const safeAccountConfig: SafeAccountConfig = {
    owners: opts.owners,
    threshold: 1,
    to: deployments.moduleSetup,
    data: encodeFunctionData({
      abi: MODULE_SETUP_ABI,
      functionName: "enableModules",
      args: [modules],
    }),
    fallbackHandler: deployments.safe4337Module,
  };

  const predictedSafe = { safeAccountConfig, safeDeploymentConfig: { saltNonce: opts.salt } };

  // Initialize Protocol Kit in "predicted safe" mode
  const protocolKit = await Safe.init({
    provider: opts.rpcUrl,
    signer: getDeployerPrivateKey(),
    predictedSafe,
    contractNetworks,
  });

  const safeAddress = (await protocolKit.getAddress()) as Address;
  if (!isNonZeroEVMAddress(safeAddress)) {
    throw new Error("safe_address_invalid");
  }
  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  // Send deployment transaction using the protocol kit signer
  const externalSigner = await protocolKit.getSafeProvider().getExternalSigner();
  if (!externalSigner) {
    throw new Error("Safe external signer unavailable");
  }

  // Check if already deployed (best effort to avoid revert)
  const publicClient = createPublicClient({ transport: http(opts.rpcUrl) });
  const code = await publicClient.getBytecode({ address: safeAddress });
  
  let txHash: `0x${string}` | null = null;
  
  if (code && code !== "0x") {
       // Already deployed
       provisionLogger.info({ safeAddress, chainId: opts.chainId }, "Safe already deployed");
  } else {
    const sentHash = (await externalSigner.sendTransaction({
      chain: null,
      to: deploymentTx.to as `0x${string}`,
      value: BigInt(deploymentTx.value),
      data: deploymentTx.data as `0x${string}`,
    })) as `0x${string}`;
    txHash = sentHash;
    await publicClient.waitForTransactionReceipt({ hash: sentHash });
  }

  await supabase
    .from("wallet_accounts")
    .update({
      safe_address: safeAddress,
      address: safeAddress,
      platform: "evm",
      provider: "safe",
      wallet_type: "safe",
      status: "ready",
      last_error: null,
      metadata: {
        owners: opts.owners,
        ownerKinds: opts.ownerKinds,
        threshold: 1,
        modules: {
          safe4337: deployments.safe4337Module,
          allowance: deployments.allowanceModule,
          recovery: deployments.recoveryModule,
        },
        enabledModules: modules,
        safeSalt: opts.salt,
      },
    })
    .eq("user_id", opts.userId)
    .eq("chain_id", opts.chainId)
    .eq("wallet_type", "safe");

  // Emit wallet event + notification (best-effort)
  try {
    await supabase.from("wallet_events").insert({
      user_id: opts.userId,
      chain_id: opts.chainId,
      safe_address: safeAddress,
      event_type: "wallet.provisioned",
      status: "completed",
      title: "Safe wallet provisioned",
      body: `Safe is ready on chain ${opts.chainId}.`,
      metadata: { txHash },
    });
  } catch {
    // best-effort
  }

  try {
    await supabase.from("notifications").insert({
      user_id: opts.userId,
      source: "transaction",
      title: "Wallet ready",
      body: `Your Safe wallet is ready on chain ${opts.chainId}.`,
      status: "completed",
      metadata: { chainId: opts.chainId, safeAddress },
    });
  } catch {
    // best-effort
  }
}
