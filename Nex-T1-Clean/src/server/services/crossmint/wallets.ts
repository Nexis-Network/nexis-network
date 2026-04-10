import "server-only";

import { redis, isRedisConfigured } from "@/server/services/redis";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { invalidateUserWalletsCache } from "@/server/wallets/user-wallets";
import {
  CROSSMINT_API_VERSION,
  type CrossmintEnv,
  crossmintRequestJson,
  getCrossmintEnv,
} from "@/server/services/crossmint/client";
import { logger } from "@/lib/logger";

export type CrossmintChainType = "solana" | "stellar";

export type ProvisionCrossmintWalletResult = {
  walletId: string;
  chainType: CrossmintChainType;
  address: string;
  locator: string;
  env: CrossmintEnv;
};

type WalletAccountsRow = {
  id: string;
  wallet_id: string;
  address: string | null;
  status: string | null;
  last_error: string | null;
  metadata: Record<string, UntypedJson> | null;
  label: string | null;
};

type CrossmintWalletResponse = {
  address?: string;
  locator?: string;
  type?: string;
  chainType?: string;
  chain?: string;
};

type CrossmintErrorEnvelope = {
  message?: string;
  error?: string;
  errors?: Array<{ message?: string }>;
};

const LOCK_TTL_SECONDS = 30;

function buildWalletId(chainType: CrossmintChainType): string {
  return `crossmint:${chainType}`;
}

function buildCrossmintLocator(userId: string, chainType: CrossmintChainType): string {
  // Explicit wallet type is important: Crossmint supports multiple wallet types per owner+chain.
  return `userId:${userId}:${chainType}:smart`;
}

function requireUserEmail(email: string | null | undefined): string {
  const value = typeof email === "string" ? email.trim() : "";
  if (!value) {
    throw new Error("Crossmint email signer requires a user email address.");
  }
  return value;
}

function parseCrossmintError(raw: string | null): string {
  if (!raw) return "crossmint_request_failed";
  try {
    const parsed = JSON.parse(raw) as CrossmintErrorEnvelope;
    const msg =
      (typeof parsed.message === "string" && parsed.message) ||
      (typeof parsed.error === "string" && parsed.error) ||
      (Array.isArray(parsed.errors) && typeof parsed.errors[0]?.message === "string" ? parsed.errors[0]?.message : "");
    return msg || raw;
  } catch {
    return raw;
  }
}

function extractWalletFields(payload: CrossmintWalletResponse | null): { address: string; locator: string } | null {
  const address = typeof payload?.address === "string" ? payload.address.trim() : "";
  const locator = typeof payload?.locator === "string" ? payload.locator.trim() : "";
  if (!address || !locator) return null;
  return { address, locator };
}

async function getWalletByLocator(locator: string, env: CrossmintEnv): Promise<{ address: string; locator: string } | null> {
  const res = await crossmintRequestJson<CrossmintWalletResponse>(
    `/api/${CROSSMINT_API_VERSION}/wallets/${encodeURIComponent(locator)}`,
    { method: "GET", env },
  );

  if (res.ok) {
    return extractWalletFields(res.data);
  }

  if (res.status === 404) {
    return null;
  }

  throw new Error(parseCrossmintError(res.errorText));
}

async function createWallet(params: {
  userId: string;
  email: string;
  chainType: CrossmintChainType;
  env: CrossmintEnv;
}): Promise<{ address: string; locator: string }> {
  const idempotencyKey = `wallet:${params.userId}:${params.chainType}:smart:email`;
  const body = {
    chainType: params.chainType,
    type: "smart",
    owner: `userId:${params.userId}`,
    config: {
      adminSigner: {
        type: "email",
        email: params.email,
      },
    },
  };

  const res = await crossmintRequestJson<CrossmintWalletResponse>(`/api/${CROSSMINT_API_VERSION}/wallets`, {
    method: "POST",
    env: params.env,
    headers: {
      "x-idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(parseCrossmintError(res.errorText));
  }

  const fields = extractWalletFields(res.data);
  if (!fields) {
    throw new Error("Crossmint wallet response missing address/locator.");
  }

  return fields;
}

export async function provisionCrossmintWalletForUser(params: {
  userId: string;
  email: string | null | undefined;
  chainType: CrossmintChainType;
}): Promise<ProvisionCrossmintWalletResult> {
  const env = getCrossmintEnv();
  const walletId = buildWalletId(params.chainType);
  const email = requireUserEmail(params.email);
  const lockKey = `crossmint_provision:${params.userId}:${params.chainType}`;

  if (isRedisConfigured) {
    const acquired = await redis.trySetNx(lockKey, "1", LOCK_TTL_SECONDS);
    if (!acquired) {
      throw new Error("Provisioning already in progress. Try again in a moment.");
    }
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: existing } = await supabase
      .from("wallet_accounts")
      .select("id,wallet_id,address,status,last_error,metadata,label")
      .eq("user_id", params.userId)
      .eq("wallet_id", walletId)
      .maybeSingle();

    const existingRow = (existing ?? null) as WalletAccountsRow | null;
    const existingAddress = typeof existingRow?.address === "string" ? existingRow.address.trim() : "";
    const existingLocator =
      typeof existingRow?.metadata?.crossmintLocator === "string" ? String(existingRow.metadata.crossmintLocator) : "";

    if (existingAddress && existingLocator) {
      return {
        walletId,
        chainType: params.chainType,
        address: existingAddress,
        locator: existingLocator,
        env,
      };
    }

    const locator = buildCrossmintLocator(params.userId, params.chainType);
    const resolved = (await getWalletByLocator(locator, env)) ?? (await createWallet({
      userId: params.userId,
      email,
      chainType: params.chainType,
      env,
    }));

    const metadata = {
      ...(existingRow?.metadata ?? {}),
      kind: params.chainType, // Enables chain-specific analytics ingestion (Solana via Helius; Stellar via Horizon).
      provider: "crossmint",
      source: "crossmint",
      embedded: true,
      crossmintLocator: resolved.locator,
      crossmintOwner: `userId:${params.userId}`,
      crossmintChainType: params.chainType,
      crossmintWalletType: "smart",
      crossmintEnv: env,
      signerType: "email",
    } satisfies Record<string, UntypedJson>;

    const label = existingRow?.label ?? `Crossmint ${params.chainType === "solana" ? "Solana" : "Stellar"} Smart Wallet`;

    const { error: upsertError } = await supabase
      .from("wallet_accounts")
      .upsert(
        {
          user_id: params.userId,
          wallet_id: walletId,
          address: resolved.address,
          chain_id: null,
          platform: params.chainType,
          wallet_type: "crossmint",
          provider: "crossmint",
          safe_address: null,
          status: "ready",
          last_error: null,
          label,
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,wallet_id" },
      );

    if (upsertError) {
      logger.error("crossmint_wallet_upsert_failed", { userId: params.userId, chainType: params.chainType, error: upsertError });
      throw new Error("Failed to persist Crossmint wallet in database.");
    }

    await invalidateUserWalletsCache(params.userId).catch(() => {});

    return {
      walletId,
      chainType: params.chainType,
      address: resolved.address,
      locator: resolved.locator,
      env,
    };
  } finally {
    if (isRedisConfigured) {
      await redis.del(lockKey).catch(() => {});
    }
  }
}
