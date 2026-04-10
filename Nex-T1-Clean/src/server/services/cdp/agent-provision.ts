/**
 * CDP Agent Wallet Provisioning
 *
 * Provisions Nex Wallets (EVM Smart Account + Solana) for autonomous
 * agents, following the same pattern as user wallet provisioning but targeting
 * the `agent_wallets` table instead of `wallet_accounts`.
 *
 * Supports:
 * - Idempotent provisioning with Redis distributed locks
 * - Generational wallet rotation on agent ownership transfer
 * - Wallet detachment and re-provisioning for agent marketplace sales
 *
 * Called from agent lifecycle flows (creation, transfer, marketplace).
 */
import "server-only";

import { redis, isRedisConfigured } from "@/server/services/redis";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import { getCdpClient } from "@/server/services/cdp/client";
import { getActiveCdpKid, buildAgentCdpSub } from "@/server/auth/cdp-jwt-bridge";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentCdpProvisionResult = {
  agentId: string;
  generation: number;
  evmSmartAccountAddress: string | null;
  evmEoaAddress: string | null;
  solanaAddress: string | null;
  cdpSub: string;
};

export type AgentWalletRow = {
  id: string;
  agent_id: string;
  owner_id: string;
  generation: number;
  wallet_id: string;
  address: string;
  chain_id: number | null;
  platform: string;
  cdp_sub: string;
  cdp_user_id: string | null;
  status: string;
  label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  detached_at: string | null;
};

export type TransferResult = {
  agentId: string;
  fromUserId: string;
  toUserId: string;
  previousGeneration: number;
  newGeneration: number;
  detachedWallets: AgentWalletRow[];
  newProvision: AgentCdpProvisionResult;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CDP_AGENT_EVM_WALLET_ID = "cdp:agent:evm:smart";
const CDP_AGENT_SOLANA_WALLET_ID = "cdp:agent:solana";
const LOCK_TTL_SECONDS = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCdpEnabled(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_ENABLE_CDP_WALLETS ??
    process.env.ENABLE_CDP_WALLETS ??
    "";
  return flag.trim().toLowerCase() === "true";
}

async function getExistingAgentWallets(
  agentId: string,
): Promise<{ evm: AgentWalletRow | null; solana: AgentWalletRow | null }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_wallets")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "active");

  if (error || !Array.isArray(data)) {
    return { evm: null, solana: null };
  }

  const rows = data as AgentWalletRow[];
  return {
    evm: rows.find((r) => r.wallet_id === CDP_AGENT_EVM_WALLET_ID) ?? null,
    solana:
      rows.find((r) => r.wallet_id === CDP_AGENT_SOLANA_WALLET_ID) ?? null,
  };
}

function hasValidAddress(row: AgentWalletRow | null): boolean {
  return (
    row !== null &&
    typeof row.address === "string" &&
    row.address.trim().length > 0 &&
    row.status === "active"
  );
}

// ---------------------------------------------------------------------------
// Main provisioning function
// ---------------------------------------------------------------------------

/**
 * Provision Nex Wallets for an autonomous agent.
 *
 * Creates an end user in CDP with:
 * - `DeveloperJWTAuthentication` (type: "jwt", kid, sub: "nex-agent:{agentId}:v{generation}")
 * - EVM Smart Account with spend permissions enabled
 * - Solana account
 *
 * Results are upserted into the `agent_wallets` table.
 */
export async function provisionAgentCdpWallets(params: {
  agentId: string;
  ownerUserId: string;
  generation?: number;
}): Promise<AgentCdpProvisionResult> {
  const { agentId, ownerUserId } = params;
  const generation = params.generation ?? 1;
  const cdpSub = buildAgentCdpSub(agentId, generation);

  if (!isCdpEnabled()) {
    logger.debug("cdp_agent_provision_skipped_disabled", { agentId });
    return {
      agentId,
      generation,
      evmSmartAccountAddress: null,
      evmEoaAddress: null,
      solanaAddress: null,
      cdpSub,
    };
  }

  const lockKey = `cdp_agent_provision:${agentId}`;
  const lockOwner = crypto.randomUUID();
  let dbSentinelInserted = false;

  if (isRedisConfigured) {
    const acquired = await redis.trySetNx(lockKey, lockOwner, LOCK_TTL_SECONDS);
    if (!acquired) {
      logger.warn("cdp_agent_provision_lock_contention", { agentId });
      throw new Error(
        "Agent Nex Wallet provisioning already in progress. Try again in a moment.",
      );
    }
  } else {
    // Fallback: atomic insert-as-lock to prevent concurrent provisioning
    // when Redis is not configured. Uses ON CONFLICT DO NOTHING so that
    // only the first caller succeeds in inserting the sentinel row.
    const supabase = getSupabaseAdminClient();
    const sentinelAddress = `provisioning-${agentId}-${generation}`;

    const { data: inserted, error: sentinelError } = await supabase
      .from("agent_wallets")
      .insert({
        agent_id: agentId,
        owner_id: ownerUserId,
        generation,
        wallet_id: CDP_AGENT_EVM_WALLET_ID,
        address: sentinelAddress,
        chain_id: null,
        platform: "evm",
        cdp_sub: cdpSub,
        cdp_user_id: null,
        status: "provisioning",
        label: "Agent Nex Wallet (EVM) (provisioning)",
        metadata: { sentinel: true },
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    // If the insert returned no row (conflict) or errored with a conflict
    // code, another process already holds the lock.
    if (!inserted || sentinelError) {
      logger.warn("cdp_agent_provision_db_lock_contention", {
        agentId,
        generation,
        sentinelError: sentinelError?.message ?? "conflict — no row inserted",
      });
      throw new Error(
        "Agent Nex Wallet provisioning already in progress (db lock). Try again in a moment.",
      );
    }

    dbSentinelInserted = true;
    logger.debug("cdp_agent_provision_db_sentinel_acquired", {
      agentId,
      generation,
      sentinelId: inserted.id,
    });
  }

  try {
    // 1. Check for existing active wallets (idempotency)
    const existing = await getExistingAgentWallets(agentId);
    const evmDone = hasValidAddress(existing.evm);
    const solanaDone = hasValidAddress(existing.solana);

    if (evmDone && solanaDone) {
      logger.debug("cdp_agent_provision_already_complete", {
        agentId,
        generation,
      });
      return {
        agentId,
        generation: existing.evm!.generation,
        evmSmartAccountAddress: existing.evm!.address,
        evmEoaAddress: null,
        solanaAddress: existing.solana!.address,
        cdpSub: existing.evm!.cdp_sub,
      };
    }

    if (evmDone || solanaDone) {
      logger.warn("cdp_agent_provision_partial_state", {
        agentId,
        evmDone,
        solanaDone,
      });
    }

    // 2. Get CDP server client
    const cdp = await getCdpClient();
    if (!cdp) {
      throw new Error(
        "CDP server client not available. Check CDP_API_KEY_ID and CDP_API_KEY_SECRET.",
      );
    }

    // 3. Resolve the active JWT kid for DeveloperJWTAuthentication
    let kid: string;
    try {
      kid = await getActiveCdpKid();
    } catch {
      throw new Error(
        "CDP JWT Bridge not configured. Set CDP_JWT_RSA_PRIVATE_KEY and CDP_JWT_RSA_PUBLIC_KEY.",
      );
    }

    // 4. Create end user via CDP API with agent-scoped sub
    logger.info("cdp_agent_provision_creating_end_user", {
      agentId,
      ownerUserId,
      generation,
      kid,
      cdpSub,
    });

    const endUser = await cdp.endUser.createEndUser({
      userId: agentId,
      authenticationMethods: [
        {
          type: "jwt" as const,
          kid,
          sub: cdpSub,
        },
      ],
      evmAccount: {
        createSmartAccount: true,
        enableSpendPermissions: true,
      },
      solanaAccount: {
        createSmartAccount: false,
      },
    });

    // 5. Extract addresses from the response
    const evmSmartAddr =
      endUser.evmSmartAccountObjects?.[0]?.address ?? null;
    const evmEoaAddr =
      endUser.evmAccountObjects?.[0]?.address ?? null;
    const solanaAddr =
      endUser.solanaAccountObjects?.[0]?.address ?? null;

    logger.info("cdp_agent_provision_end_user_created", {
      agentId,
      ownerUserId,
      generation,
      cdpUserId: endUser.userId,
      evmSmart: evmSmartAddr,
      evmEoa: evmEoaAddr,
      solana: solanaAddr,
    });

    // 6. Upsert wallet rows into agent_wallets
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    const upserts: Array<{
      agent_id: string;
      owner_id: string;
      generation: number;
      wallet_id: string;
      address: string;
      chain_id: number | null;
      platform: string;
      cdp_sub: string;
      cdp_user_id: string | null;
      status: string;
      label: string;
      metadata: Record<string, unknown>;
      created_at: string;
    }> = [];

    if (evmSmartAddr) {
      upserts.push({
        agent_id: agentId,
        owner_id: ownerUserId,
        generation,
        wallet_id: CDP_AGENT_EVM_WALLET_ID,
        address: evmSmartAddr,
        chain_id: 8453, // Base (default CDP smart account chain)
        platform: "evm",
        cdp_sub: cdpSub,
        cdp_user_id: endUser.userId ?? null,
        status: "active",
        label: "Agent Nex Wallet (EVM)",
        metadata: {
          kind: "evm",
          provider: "cdp",
          source: "cdp",
          embedded: true,
          accountType: "smart",
          ownerEoa: evmEoaAddr,
          cdpUserId: endUser.userId,
          spendPermissions: true,
        },
        created_at: now,
      });
    }

    if (solanaAddr) {
      upserts.push({
        agent_id: agentId,
        owner_id: ownerUserId,
        generation,
        wallet_id: CDP_AGENT_SOLANA_WALLET_ID,
        address: solanaAddr,
        chain_id: null,
        platform: "solana",
        cdp_sub: cdpSub,
        cdp_user_id: endUser.userId ?? null,
        status: "active",
        label: "Agent Nex Wallet (SOL)",
        metadata: {
          kind: "solana",
          provider: "cdp",
          source: "cdp",
          embedded: true,
          accountType: "eoa",
          cdpUserId: endUser.userId,
        },
        created_at: now,
      });
    }

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("agent_wallets")
        .upsert(upserts, { onConflict: "agent_id,wallet_id,generation" });

      if (upsertError) {
        logger.error("cdp_agent_provision_upsert_failed", {
          agentId,
          error: upsertError,
        });
        throw new Error(
          "Failed to persist Agent Nex Wallet accounts in database.",
        );
      }
    }

    // 7. Invalidate owner wallet caches
    await invalidateUserWalletsCache(ownerUserId).catch(() => {});

    return {
      agentId,
      generation,
      evmSmartAccountAddress: evmSmartAddr,
      evmEoaAddress: evmEoaAddr,
      solanaAddress: solanaAddr,
      cdpSub,
    };
  } finally {
    if (isRedisConfigured) {
      await redis.tryReleaseLock(lockKey, lockOwner).catch(() => {});
    }

    // Safety net: remove any leftover sentinel rows that were not promoted
    // to 'active'. This covers crash/error paths where the upsert with the
    // real address never executed.
    if (dbSentinelInserted) {
      try {
        const supabaseCleanup = getSupabaseAdminClient();
        await supabaseCleanup
          .from("agent_wallets")
          .delete()
          .eq("agent_id", agentId)
          .eq("generation", generation)
          .eq("status", "provisioning");
      } catch (err: unknown) {
        logger.error("cdp_agent_provision_sentinel_cleanup_failed", {
          agentId,
          generation,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rollback helpers
// ---------------------------------------------------------------------------

/**
 * Re-activate wallets that were detached during a failed transfer.
 *
 * Scopes the rollback to the exact wallet row IDs and generation to avoid
 * re-activating wallets from a different transfer cycle. Logs a CRITICAL
 * error if the rollback itself fails so operators can remediate manually.
 */
async function rollbackDetachedWallets(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  agentId: string,
  fromUserId: string,
  toUserId: string,
  generation: number,
  detachedWallets: AgentWalletRow[],
): Promise<void> {
  const detachedIds = detachedWallets.map((w) => w.id);

  if (detachedIds.length === 0) {
    return;
  }

  const { error: rollbackError } = await supabase
    .from("agent_wallets")
    .update({ status: "active", detached_at: null })
    .eq("agent_id", agentId)
    .eq("status", "detached")
    .eq("generation", generation)
    .in("id", detachedIds);

  if (rollbackError) {
    logger.error("CRITICAL_cdp_agent_transfer_detach_rollback_failed", {
      agentId,
      fromUserId,
      toUserId,
      generation,
      detachedWalletIds: detachedIds,
      error: rollbackError,
      remediation:
        "Manual intervention required: re-activate agent_wallets " +
        `with ids [${detachedIds.join(", ")}] for agent ${agentId}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Ownership transfer
// ---------------------------------------------------------------------------

/**
 * Transfer agent wallet ownership on agent sale.
 *
 * Orchestrates:
 * 1. Ownership verification
 * 2. Current generation lookup
 * 3. Active wallet detachment
 * 4. Agent owner update
 * 5. New wallet provisioning for the new owner
 *
 * Uses sequential operations with rollback guards for atomicity.
 */
export async function transferAgentOwnership(params: {
  agentId: string;
  fromUserId: string;
  toUserId: string;
  orgId: string | null;
}): Promise<TransferResult> {
  const { agentId, fromUserId, toUserId, orgId } = params;
  const supabase = getSupabaseAdminClient();

  logger.info("cdp_agent_transfer_started", {
    agentId,
    fromUserId,
    toUserId,
    orgId: orgId ?? "personal",
  });

  // 1. Verify current ownership
  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("id,owner_user_id")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  if (agent.owner_user_id !== fromUserId) {
    throw new Error(
      `Ownership verification failed: agent ${agentId} is not owned by ${fromUserId}`,
    );
  }

  // 2. Get current generation
  const { data: genData, error: genError } = await supabase
    .from("agent_wallets")
    .select("generation")
    .eq("agent_id", agentId)
    .order("generation", { ascending: false })
    .limit(1);

  if (genError) {
    throw new Error(
      `Failed to query agent wallet generation: ${genError.message}`,
    );
  }

  const currentGeneration =
    genData && genData.length > 0 ? (genData[0].generation as number) : 0;
  const newGeneration = currentGeneration + 1;

  // 3. Detach current active wallets (scoped to current owner to prevent TOCTOU race)
  const { data: detachedRows, error: detachError } = await supabase
    .from("agent_wallets")
    .update({
      status: "detached",
      detached_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId)
    .eq("owner_id", fromUserId)
    .eq("status", "active")
    .select("*");

  if (detachError) {
    throw new Error(
      `Failed to detach agent wallets: ${detachError.message}`,
    );
  }

  const detachedWallets = (detachedRows ?? []) as AgentWalletRow[];

  logger.info("cdp_agent_wallets_detached", {
    agentId,
    count: detachedWallets.length,
    generation: currentGeneration,
  });

  // 4. Update agent owner — if this fails, attempt to rollback detachment
  const { error: ownerUpdateError } = await supabase
    .from("agent")
    .update({ owner_user_id: toUserId })
    .eq("id", agentId)
    .eq("owner_user_id", fromUserId);

  if (ownerUpdateError) {
    logger.error("cdp_agent_transfer_owner_update_failed", {
      agentId,
      fromUserId,
      toUserId,
      generation: currentGeneration,
      error: ownerUpdateError,
    });

    // Rollback: re-activate only the wallets we detached in this transfer,
    // scoped by both row ID and generation to prevent re-activating wallets
    // from a previous transfer cycle.
    await rollbackDetachedWallets(
      supabase,
      agentId,
      fromUserId,
      toUserId,
      currentGeneration,
      detachedWallets,
    );

    throw new Error(
      `Failed to update agent owner: ${ownerUpdateError.message}`,
    );
  }

  logger.info("cdp_agent_owner_updated", {
    agentId,
    fromUserId,
    toUserId,
  });

  // 5. Provision new wallets for the new owner
  let newProvision: AgentCdpProvisionResult;
  try {
    newProvision = await provisionAgentCdpWallets({
      agentId,
      ownerUserId: toUserId,
      generation: newGeneration,
    });
  } catch (provisionError) {
    // Provisioning failed after ownership was already transferred.
    // Attempt full rollback: restore original owner + re-activate wallets.
    const provisionErrMsg =
      provisionError instanceof Error
        ? provisionError.message
        : String(provisionError);

    logger.error("cdp_agent_transfer_provision_failed", {
      agentId,
      fromUserId,
      toUserId,
      newGeneration,
      error: provisionErrMsg,
    });

    // 5a. Restore the original owner
    const { error: ownerRollbackError } = await supabase
      .from("agent")
      .update({ owner_user_id: fromUserId })
      .eq("id", agentId)
      .eq("owner_user_id", toUserId);

    if (ownerRollbackError) {
      // Owner rollback failed — the database is now in an inconsistent state.
      // Log as CRITICAL with full remediation context and bail out.
      logger.error("CRITICAL_cdp_agent_transfer_owner_rollback_failed", {
        agentId,
        fromUserId,
        toUserId,
        generation: currentGeneration,
        error: ownerRollbackError,
        remediation:
          `Manual intervention required: agent ${agentId} owner is ${toUserId} ` +
          `but should be restored to ${fromUserId}. ` +
          `Wallets (generation ${currentGeneration}) are detached.`,
      });

      throw new Error(
        `Agent ownership transferred but wallet provisioning failed, ` +
          `and ownership rollback also failed. ` +
          `CRITICAL: Manual remediation required for agent ${agentId}. ` +
          `Provision error: ${provisionErrMsg}`,
      );
    }

    // 5b. Re-activate detached wallets
    await rollbackDetachedWallets(
      supabase,
      agentId,
      fromUserId,
      toUserId,
      currentGeneration,
      detachedWallets,
    );

    throw new Error(
      `Agent ownership transfer rolled back: wallet provisioning failed. ` +
        `Original owner restored. Error: ${provisionErrMsg}`,
    );
  }

  // 6. Invalidate caches for both users
  await Promise.all([
    invalidateUserWalletsCache(fromUserId).catch(() => {}),
    invalidateUserWalletsCache(toUserId).catch(() => {}),
  ]);

  logger.info("cdp_agent_transfer_complete", {
    agentId,
    fromUserId,
    toUserId,
    previousGeneration: currentGeneration,
    newGeneration,
  });

  return {
    agentId,
    fromUserId,
    toUserId,
    previousGeneration: currentGeneration,
    newGeneration,
    detachedWallets,
    newProvision,
  };
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Get wallets for an agent, optionally filtered by status.
 * Returns wallets ordered by generation descending (newest first).
 */
export async function getAgentWallets(
  agentId: string,
  status: string = "active",
): Promise<AgentWalletRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_wallets")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", status)
    .order("generation", { ascending: false });

  if (error) {
    logger.error("cdp_agent_wallets_query_failed", {
      agentId,
      status,
      error,
    });
    return [];
  }

  return (data ?? []) as AgentWalletRow[];
}

/**
 * Row returned by `getDetachedWalletsByOwner`, which includes the related
 * agent's name via a Supabase relation join.
 */
export type DetachedWalletRow = AgentWalletRow & {
  agent_name: string | null;
};

/**
 * Get all detached wallets previously owned by a user.
 * Joins the `agent` table to include `agent_name` in each row.
 * Supports optional pagination via `limit` and `offset`.
 */
export async function getDetachedWalletsByOwner(
  ownerUserId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ wallets: DetachedWalletRow[]; total: number }> {
  const supabase = getSupabaseAdminClient();

  // Build the query with an inner join to the agent table for name.
  // Supabase PostgREST syntax: `agent:agent_id(name)` follows the FK.
  let query = supabase
    .from("agent_wallets")
    .select("*, agent:agent_id(name)", { count: "exact" })
    .eq("owner_id", ownerUserId)
    .eq("status", "detached")
    .order("detached_at", { ascending: false });

  if (typeof options.limit === "number") {
    const offset = options.offset ?? 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    logger.error("cdp_agent_detached_wallets_query_failed", {
      ownerUserId,
      error,
    });
    return { wallets: [], total: 0 };
  }

  const rows = (data ?? []) as Array<
    AgentWalletRow & { agent?: { name: string } | null }
  >;

  // Flatten the nested `agent.name` into a top-level `agent_name` field
  // so callers receive a flat structure.
  const wallets: DetachedWalletRow[] = rows.map((row) => {
    const { agent, ...rest } = row;
    return {
      ...rest,
      agent_name: agent?.name ?? null,
    };
  });

  return { wallets, total: count ?? wallets.length };
}
