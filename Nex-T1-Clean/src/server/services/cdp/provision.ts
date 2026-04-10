/**
 * Nex Wallet Pre-Generation
 *
 * Provisions Nex Wallets (EVM Smart Account + Solana) for a user
 * by calling the CDP Server SDK `endUser.createEndUser()` API.
 *
 * - Idempotent: Checks `wallet_accounts` table first
 * - Lock-protected: Redis distributed lock prevents duplicate API calls
 * - Stores results in `wallet_accounts` table with `wallet_type: 'cdp'`
 *
 * Called from the wallet bootstrap flow at user signup.
 */
import "server-only";

import { isRedisConfigured, redis } from "@/server/services/redis";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import { getCdpClient } from "@/server/services/cdp/client";
import { getActiveCdpKid } from "@/server/auth/cdp-jwt-bridge";
import { logger } from "@/lib/logger";
import {
  buildNetworkCapabilityMetadata,
  getDefaultCdpEvmCapability,
} from "@/lib/networks/capabilities";
import {
  getCdpErrorMeta,
  isExistingCdpUserConflict,
} from "@/server/services/cdp/provision-errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CdpProvisionResult = {
  userId: string;
  evmSmartAccountAddress: string | null;
  evmEoaAddress: string | null;
  solanaAddress: string | null;
  conflictRecovered: boolean;
};

type WalletAccountRow = {
  id: string;
  wallet_id: string;
  address: string | null;
  status: string | null;
};

type WalletAccountUpsertRow = {
  user_id: string;
  wallet_id: string;
  address: string | null;
  chain_id: number | null;
  platform: string;
  wallet_type: string;
  provider: string;
  safe_address: string | null;
  status: string;
  last_error: string | null;
  label: string;
  metadata: Record<string, UntypedJson>;
  updated_at: string;
};

type CdpEndUserRecord = {
  userId: string;
  authenticationMethods?: Array<{
    type?: string;
    sub?: string;
    kid?: string;
  }>;
  evmAccountObjects?: Array<{
    address?: string;
  }>;
  evmSmartAccountObjects?: Array<{
    address?: string;
    ownerAddresses?: string[];
  }>;
  solanaAccountObjects?: Array<{
    address?: string;
  }>;
};

type CdpClient = Exclude<Awaited<ReturnType<typeof getCdpClient>>, null>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CDP_EVM_WALLET_ID = "cdp:evm:smart";
const CDP_SOLANA_WALLET_ID = "cdp:solana";
const LOCK_TTL_SECONDS = 60;
const DEFAULT_CDP_EVM_CAPABILITY = getDefaultCdpEvmCapability();
const CONFIGURED_CDP_PROJECT_ID =
  process.env.CDP_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_CDP_PROJECT_ID?.trim() ||
  null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCdpEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_CDP_WALLETS ??
    process.env.ENABLE_CDP_WALLETS ??
    "";
  return flag.trim().toLowerCase() === "true";
}

async function getExistingCdpWallets(
  userId: string,
): Promise<{ evm: WalletAccountRow | null; solana: WalletAccountRow | null }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wallet_accounts")
    .select("id,wallet_id,address,status")
    .eq("user_id", userId)
    .eq("wallet_type", "cdp");

  if (error || !Array.isArray(data)) {
    return { evm: null, solana: null };
  }

  const rows = data as WalletAccountRow[];
  return {
    evm: rows.find((r) => r.wallet_id === CDP_EVM_WALLET_ID) ?? null,
    solana: rows.find((r) => r.wallet_id === CDP_SOLANA_WALLET_ID) ?? null,
  };
}

function hasValidAddress(row: WalletAccountRow | null): boolean {
  return (
    row !== null &&
    typeof row.address === "string" &&
    row.address.trim().length > 0 &&
    row.status === "ready"
  );
}

function isMissingOnConflictConstraint(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P10";
}

function readAddress(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getEvmSmartAddress(endUser: CdpEndUserRecord): string | null {
  return readAddress(endUser.evmSmartAccountObjects?.[0]?.address);
}

function getSolanaAddress(endUser: CdpEndUserRecord): string | null {
  return readAddress(endUser.solanaAccountObjects?.[0]?.address);
}

function getEvmOwnerAddress(endUser: CdpEndUserRecord): string | null {
  return (
    readAddress(endUser.evmSmartAccountObjects?.[0]?.ownerAddresses?.[0]) ??
    readAddress(endUser.evmAccountObjects?.[0]?.address)
  );
}

async function findEndUserByJwtSub(
  cdp: CdpClient,
  jwtSub: string,
): Promise<CdpEndUserRecord | null> {
  let pageToken: string | undefined;
  let page = 0;

  while (page < 200) {
    page += 1;
    const response = await cdp.endUser.listEndUsers({
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
    });

    const endUsers = Array.isArray(response.endUsers)
      ? (response.endUsers as CdpEndUserRecord[])
      : [];

    const match = endUsers.find((user) =>
      Array.isArray(user.authenticationMethods) &&
      user.authenticationMethods.some((method) =>
        method?.type === "jwt" && method?.sub === jwtSub
      )
    );

    if (match) return match;

    if (!response.nextPageToken) break;
    pageToken = response.nextPageToken;
  }

  return null;
}

async function ensureMissingRecoveredWallets(params: {
  cdp: CdpClient;
  endUser: CdpEndUserRecord;
  originalUserId: string;
  requestingEvm: boolean;
  requestingSolana: boolean;
}): Promise<CdpEndUserRecord> {
  let endUser = params.endUser;
  let shouldRefresh = false;

  if (params.requestingEvm && !getEvmSmartAddress(endUser)) {
    try {
      const result = await params.cdp.endUser.addEndUserEvmSmartAccount({
        userId: endUser.userId,
        enableSpendPermissions: true,
      });
      shouldRefresh = true;
      logger.info({
        originalUserId: params.originalUserId,
        cdpUserId: endUser.userId,
        evmSmart: readAddress(result?.evmSmartAccount?.address),
      }, "cdp_provision_recovered_user_added_evm_smart");
    } catch (error) {
      const errorMeta = getCdpErrorMeta(error);
      logger.error({
        originalUserId: params.originalUserId,
        cdpUserId: endUser.userId,
        statusCode: errorMeta.statusCode,
        errorType: errorMeta.errorType,
        errorMessage: errorMeta.message,
      }, "cdp_provision_recovered_user_add_evm_failed");
      throw error;
    }
  }

  if (params.requestingSolana && !getSolanaAddress(endUser)) {
    try {
      const result = await params.cdp.endUser.addEndUserSolanaAccount({
        userId: endUser.userId,
      });
      shouldRefresh = true;
      logger.info({
        originalUserId: params.originalUserId,
        cdpUserId: endUser.userId,
        solana: readAddress(result?.solanaAccount?.address),
      }, "cdp_provision_recovered_user_added_solana");
    } catch (error) {
      const errorMeta = getCdpErrorMeta(error);
      logger.error({
        originalUserId: params.originalUserId,
        cdpUserId: endUser.userId,
        statusCode: errorMeta.statusCode,
        errorType: errorMeta.errorType,
        errorMessage: errorMeta.message,
      }, "cdp_provision_recovered_user_add_solana_failed");
      throw error;
    }
  }

  if (!shouldRefresh) return endUser;

  try {
    endUser = await params.cdp.endUser.getEndUser({
      userId: endUser.userId,
    }) as CdpEndUserRecord;
    return endUser;
  } catch (error) {
    const errorMeta = getCdpErrorMeta(error);
    logger.error({
      originalUserId: params.originalUserId,
      cdpUserId: endUser.userId,
      statusCode: errorMeta.statusCode,
      errorType: errorMeta.errorType,
      errorMessage: errorMeta.message,
    }, "cdp_provision_recovered_user_refresh_failed");
    throw error;
  }
}

async function persistWalletAccounts(rows: WalletAccountUpsertRow[]): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error: upsertError } = await supabase
    .from("wallet_accounts")
    .upsert(rows, { onConflict: "user_id,wallet_id" });

  if (!upsertError) return;
  if (!isMissingOnConflictConstraint(upsertError)) throw upsertError;

  logger.warn(
    { code: upsertError.code, message: upsertError.message },
    "cdp_provision_on_conflict_missing_fallback",
  );

  for (const row of rows) {
    const { data: existingRows, error: lookupError } = await supabase
      .from("wallet_accounts")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("wallet_id", row.wallet_id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (lookupError) throw lookupError;

    const existingId = existingRows?.[0]?.id;
    if (existingId) {
      const { error: updateError } = await supabase
        .from("wallet_accounts")
        .update(row)
        .eq("id", existingId);
      if (updateError) throw updateError;
      continue;
    }

    const { error: insertError } = await supabase
      .from("wallet_accounts")
      .insert(row);
    if (insertError) throw insertError;
  }
}

// ---------------------------------------------------------------------------
// Main provisioning function
// ---------------------------------------------------------------------------

/**
 * Provision Nex Wallets for a user.
 *
 * Creates an end user in CDP with:
 * - `DeveloperJWTAuthentication` (type: "jwt", kid, sub: userId)
 * - EVM Smart Account with spend permissions enabled
 * - Solana account
 *
 * Results are upserted into the `wallet_accounts` table.
 */
export async function provisionCdpWalletsForUser(params: {
  userId: string;
  email?: string | null;
}): Promise<CdpProvisionResult> {
  if (!isCdpEnabled()) {
    logger.debug({ userId: params.userId }, "cdp_provision_skipped_disabled");
    return {
      userId: params.userId,
      evmSmartAccountAddress: null,
      evmEoaAddress: null,
      solanaAddress: null,
      conflictRecovered: false,
    };
  }

  const lockKey = `cdp_provision:${params.userId}`;
  const lockOwner = crypto.randomUUID();

  if (isRedisConfigured) {
    const acquired = await redis.trySetNx(lockKey, lockOwner, LOCK_TTL_SECONDS);
    if (!acquired) {
      logger.warn({
        userId: params.userId,
      }, "cdp_provision_lock_contention");
      throw new Error(
        "Nex Wallet provisioning already in progress. Try again in a moment.",
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, Redis is required for the distributed lock. Without it we
    // risk double-provisioning wallets (costly CDP API calls + data corruption).
    logger.warn({
      userId: params.userId,
      message:
        "Redis not configured in production — aborting to prevent double-provision.",
    }, "cdp_provision_no_redis_lock");
    throw new Error(
      "Nex Wallet provisioning requires Redis in production for distributed locking.",
    );
  }

  try {
    // 1. Check for existing wallets (idempotency + partial recovery)
    const existing = await getExistingCdpWallets(params.userId);
    const evmDone = hasValidAddress(existing.evm);
    const solanaDone = hasValidAddress(existing.solana);

    if (evmDone && solanaDone) {
      logger.debug({
        userId: params.userId,
      }, "cdp_provision_already_complete");
      return {
        userId: params.userId,
        evmSmartAccountAddress: existing.evm!.address,
        evmEoaAddress: null,
        solanaAddress: existing.solana!.address,
        conflictRecovered: false,
      };
    }

    if (evmDone || solanaDone) {
      logger.warn({
        userId: params.userId,
        evmDone,
        solanaDone,
      }, "cdp_provision_partial_state");
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

    // 4. Create end user — only request wallet types that are MISSING.
    //    CDP's createEndUser is NOT idempotent for individual accounts, so
    //    re-requesting an already-provisioned wallet type wastes API calls and
    //    may fail.
    logger.info({
      userId: params.userId,
      kid,
      requestingEvm: !evmDone,
      requestingSolana: !solanaDone,
    }, "cdp_provision_creating_end_user");

    let endUser: CdpEndUserRecord;
    let conflictRecovered = false;

    try {
      endUser = await cdp.endUser.createEndUser({
        userId: params.userId,
        authenticationMethods: [
          {
            type: "jwt" as const,
            kid,
            sub: params.userId,
          },
        ],
        ...(!evmDone && {
          evmAccount: {
            createSmartAccount: true,
            enableSpendPermissions: true,
          },
        }),
        ...(!solanaDone && {
          solanaAccount: {
            createSmartAccount: false,
          },
        }),
      }) as CdpEndUserRecord;
    } catch (createError) {
      if (isExistingCdpUserConflict(createError)) {
        conflictRecovered = true;
        const createErrorMeta = getCdpErrorMeta(createError);
        logger.info({
          userId: params.userId,
          statusCode: createErrorMeta.statusCode,
          errorType: createErrorMeta.errorType,
          errorMessage: createErrorMeta.message,
        }, "cdp_provision_user_already_exists_fetching");

        try {
          // If the user already exists, but the DB is out of sync, fetch the user
          endUser = await cdp.endUser.getEndUser({
            userId: params.userId,
          }) as CdpEndUserRecord;
        } catch (fetchError) {
          const fetchErrorMeta = getCdpErrorMeta(fetchError);
          logger.warn({
            userId: params.userId,
            statusCode: fetchErrorMeta.statusCode,
            errorType: fetchErrorMeta.errorType,
            errorMessage: fetchErrorMeta.message,
          }, "cdp_provision_existing_user_fetch_failed_trying_sub_lookup");

          const endUserBySub = await findEndUserByJwtSub(cdp, params.userId);
          if (!endUserBySub) {
            logger.error({
              userId: params.userId,
            }, "cdp_provision_sub_lookup_failed");
            throw new Error(
              "User exists in CDP but failed to fetch their details during recovery.",
            );
          }

          logger.warn({
            userId: params.userId,
            cdpUserId: endUserBySub.userId,
          }, "cdp_provision_conflict_recovered_by_sub");

          try {
            endUser = await cdp.endUser.getEndUser({
              userId: endUserBySub.userId,
            }) as CdpEndUserRecord;
          } catch {
            endUser = endUserBySub;
          }
        }

        endUser = await ensureMissingRecoveredWallets({
          cdp,
          endUser,
          originalUserId: params.userId,
          requestingEvm: !evmDone,
          requestingSolana: !solanaDone,
        });

        logger.info(
          { userId: params.userId, cdpUserId: endUser.userId },
          "cdp_provision_conflict_recovered",
        );
      } else {
        const createErrorMeta = getCdpErrorMeta(createError);
        logger.error({
          userId: params.userId,
          statusCode: createErrorMeta.statusCode,
          errorType: createErrorMeta.errorType,
          errorMessage: createErrorMeta.message,
        }, "cdp_provision_create_end_user_failed");
        throw createError;
      }
    }

    // 5. Extract addresses — merge existing addresses with newly provisioned ones
    const evmSmartAddr = evmDone
      ? existing.evm!.address
      : getEvmSmartAddress(endUser);
    const evmEoaAddr = evmDone
      ? null
      : getEvmOwnerAddress(endUser);
    const solanaAddr = solanaDone
      ? existing.solana!.address
      : getSolanaAddress(endUser);

    logger.info({
      userId: params.userId,
      cdpUserId: endUser.userId,
      evmSmart: evmSmartAddr,
      evmEoa: evmEoaAddr,
      solana: solanaAddr,
      conflictRecovered,
      partialRecovery: evmDone || solanaDone,
    }, "cdp_provision_end_user_created");

    // 6. Upsert wallet rows into wallet_accounts
    const now = new Date().toISOString();

    const upserts: WalletAccountUpsertRow[] = [];

    if (evmSmartAddr) {
      upserts.push({
        user_id: params.userId,
        wallet_id: CDP_EVM_WALLET_ID,
        address: evmSmartAddr,
        chain_id: DEFAULT_CDP_EVM_CAPABILITY.chainId,
        platform: "evm",
        wallet_type: "cdp",
        provider: "cdp",
        safe_address: null,
        status: "ready",
        last_error: null,
        label: "Nex Wallet (EVM)",
        metadata: {
          kind: "evm",
          provider: "cdp",
          source: "cdp",
          embedded: true,
          accountType: "smart",
          ownerEoa: evmEoaAddr,
          cdpUserId: endUser.userId,
          cdpProjectId: CONFIGURED_CDP_PROJECT_ID,
          cdpJwtKid: kid,
          spendPermissions: true,
          ...buildNetworkCapabilityMetadata(DEFAULT_CDP_EVM_CAPABILITY),
        },
        updated_at: now,
      });
    }

    if (solanaAddr) {
      upserts.push({
        user_id: params.userId,
        wallet_id: CDP_SOLANA_WALLET_ID,
        address: solanaAddr,
        chain_id: null,
        platform: "solana",
        wallet_type: "cdp",
        provider: "cdp",
        safe_address: null,
        status: "ready",
        last_error: null,
        label: "Nex Wallet (SOL)",
        metadata: {
          kind: "solana",
          provider: "cdp",
          source: "cdp",
          embedded: true,
          accountType: "eoa",
          cdpUserId: endUser.userId,
          cdpProjectId: CONFIGURED_CDP_PROJECT_ID,
          cdpJwtKid: kid,
          identityProvider: "cdp",
          executionProvider: "cdp",
          networkKey: "solana-mainnet",
        },
        updated_at: now,
      });
    }

    if (upserts.length > 0) {
      try {
        await persistWalletAccounts(upserts);
      } catch (upsertError) {
        logger.error({
          userId: params.userId,
          error: upsertError,
        }, "cdp_provision_upsert_failed");
        throw new Error("Failed to persist Nex Wallet accounts in database.");
      }
    }

    // 7. Invalidate wallet caches
    await invalidateUserWalletsCache(params.userId).catch(() => {});

    return {
      userId: params.userId,
      evmSmartAccountAddress: evmSmartAddr,
      evmEoaAddress: evmEoaAddr,
      solanaAddress: solanaAddr,
      conflictRecovered,
    };
  } finally {
    if (isRedisConfigured) {
      await redis.tryReleaseLock(lockKey, lockOwner).catch(() => {});
    }
  }
}
