import type { User, Session } from "@supabase/supabase-js";
import { createHmac } from "crypto";

import {
  buildWalletChallengeMessage,
  calculateWalletChallengeExpiry,
  createWalletNonce,
  getWalletChallengeTtl,
  isWalletChallengeExpired,
  normalizeWalletAddress,
  verifyWalletSignature,
  type SupportedChain,
} from "@/server/wallets/utils";
import { getSupabaseAdminClient, getSupabaseServerAnonClient } from "@/server/services/supabase/supabase-admin";
import { getErrorMessage } from "@/lib/utils/error";
import { checkRateLimit, walletVerifyRateLimit } from "@/server/security/rate-limit";
import { walletLogger } from "@/server/logging/logger";


import { logger } from '@/lib/logger';
/**
 * Generate a deterministic but non-enumerable email address for wallet users.
 * 
 * Security considerations:
 * - Uses HMAC with a secret salt to prevent address→email enumeration
 * - Deterministic: same wallet always maps to same email (required for Supabase upsert)
 * - Salt must be stable (changing it will orphan existing wallet users)
 * - If no salt configured, falls back to direct mapping (less secure but functional)
 */
function generateWalletEmail(chain: SupportedChain, normalizedAddress: string): string {
  const domain = process.env.WALLET_LOGIN_EMAIL_DOMAIN?.trim() ?? "wallet.nex-t1.ai";
  const salt = process.env.WALLET_EMAIL_SALT?.trim();

  // If salt is configured, use HMAC to generate a non-enumerable email
  if (salt && salt.length >= 16) {
    const hmac = createHmac("sha256", salt);
    hmac.update(`${chain}:${normalizedAddress}`);
    const hash = hmac.digest("hex").slice(0, 24);
    return `w-${chain.slice(0, 3)}-${hash}@${domain}`;
  }

  // Fallback: direct mapping (less secure but backwards compatible)
  // Warn in production if no salt is configured
  if (process.env.NODE_ENV === "production" && !salt) {
    logger.warn(
      "WALLET_EMAIL_SALT not configured. Wallet emails are enumerable. " +
      "Set a 32+ character secret to WALLET_EMAIL_SALT for better security."
    );
  }

  let localPart = `${chain}-${normalizedAddress}`.replace(/[^a-zA-Z0-9._+-]/g, "");
  if (localPart.length === 0) {
    localPart = `${chain}-${Buffer.from(normalizedAddress).toString("hex")}`;
  }
  if (localPart.length > 62) {
    localPart = localPart.slice(0, 62);
  }
  return `${localPart}@${domain}`;
}

type WalletChallengePurpose = "login" | "link";

export type WalletChallengeResult = {
  nonce: string;
  message: string;
  expiresAt: string;
  chain: SupportedChain;
  chainId: number | null;
  chainNamespace: string | null;
  createdAt: string;
};

export type IssueWalletChallengeParams = {
  purpose: WalletChallengePurpose;
  chain: SupportedChain;
  address: string;
  chainId?: number | null;
  chainNamespace?: string | null;
  supabaseUid?: string | null;
};

export class WalletRateLimitError extends Error {
  constructor(message: string, public readonly headers: HeadersInit | undefined) {
    super(message);
    this.name = "WalletRateLimitError";
  }
}

export class WalletRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "WalletRequestError";
  }
}

function safeGetSupabaseAdminClient() {
  try {
    return getSupabaseAdminClient();
  } catch (error) {
    const message = getErrorMessage(error, "Supabase admin client unavailable");
    const status = message.includes("SUPABASE_SERVICE_ROLE_KEY") ? 503 : 500;
    throw new WalletRequestError(message, status);
  }
}

async function resolveAppUserId(adminClient: ReturnType<typeof getSupabaseAdminClient>, supabaseUid: string) {
  try {
    const { data } = await adminClient
      .from("user")
      .select("id")
      .eq("supabase_uid", supabaseUid)
      .maybeSingle<{ id: number | null }>();

    if (typeof data?.id === "number") {
      return data.id;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("wallet_user_lookup_failed", getErrorMessage(error, ""));
    }
  }
  return null;
}

export async function issueWalletChallenge(params: IssueWalletChallengeParams): Promise<WalletChallengeResult> {
  const {
    purpose,
    chain,
    address,
    chainId: rawChainId = null,
    chainNamespace = null,
    supabaseUid = null,
  } = params;

  const adminClient = safeGetSupabaseAdminClient();

  const normalizedAddress = normalizeWalletAddress(chain, address);
  const nonce = createWalletNonce();
  const issuedAt = new Date().toISOString();
  const expiresAt = calculateWalletChallengeExpiry(getWalletChallengeTtl());
  const message = buildWalletChallengeMessage({ chain, address, nonce, issuedAt });

  const insertPayload: Record<string, UntypedJson> = {
    chain,
    chain_id: Number.isFinite(rawChainId ?? NaN) ? rawChainId : null,
    address,
    normalized_address: normalizedAddress,
    purpose,
    nonce,
    message,
    expires_at: expiresAt,
    created_at: issuedAt,
    used: false,
  };

  if (purpose === "link" && supabaseUid) {
    insertPayload.supabase_uid = supabaseUid;
    const appUserId = await resolveAppUserId(adminClient, supabaseUid);
    if (typeof appUserId === "number") {
      insertPayload.user_id = appUserId;
    }
  }

  // P0 Fix: Avoid 23505 Duplicate Key error (and eventual 504 timeout due to retries)
  // by proactively deleting any existing unused challenges for this address/purpose.
  // This ensures a clean slate for the NEW challenge even if the previous one is "stuck"
  // or was just created in a racing parallel request.
  try {
    const { error: deleteError } = await adminClient
      .from("wallet_auth_challenge")
      .delete()
      .eq("normalized_address", normalizedAddress)
      .eq("purpose", purpose)
      .eq("used", false);
    
    if (deleteError) {
      walletLogger.warn({
        event: "wallet_challenge_cleanup_failed",
        error: deleteError,
        normalizedAddress,
      });
    }
  } catch {
    // Non-fatal, proceed to insert
  }

  // Add timeout to prevent hanging on slow database connections
  // Increased from 5s to 15s to accommodate network latency in Railway deployments
  const DB_TIMEOUT_MS = 15_000;
  const insertStart = Date.now();
  const insertPromise = adminClient.from("wallet_auth_challenge").insert(insertPayload).single();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Database insert timeout")), DB_TIMEOUT_MS);
  });

  try {
    const { error } = await Promise.race([insertPromise, timeoutPromise]);
    const insertDuration = Date.now() - insertStart;
    
    if (error) {
      logger.error("wallet_challenge_insert_failed", { error, insertPayload, durationMs: insertDuration });
      const message = getErrorMessage(error, "Failed to create wallet challenge");
      throw new WalletRequestError(message, 500);
    }
    
    // Log successful inserts with timing for monitoring
    if (insertDuration > 3000) {
      walletLogger.warn({
        event: "wallet_challenge_slow_insert",
        durationMs: insertDuration,
        normalizedAddress,
      });
    }
  } catch (error) {
    const insertDuration = Date.now() - insertStart;
    if (error instanceof Error && error.message === "Database insert timeout") {
      logger.error("wallet_challenge_insert_timeout", { 
        insertPayload, 
        durationMs: insertDuration,
        timeoutMs: DB_TIMEOUT_MS,
        supabaseUrl: process.env.SUPABASE_URL?.replace(/:[^:]*@/, ':***@') ?? 'not set', // Redact password
      });
      throw new WalletRequestError(
        `Database timeout after ${Math.round(insertDuration / 1000)}s - check SUPABASE_URL points at the active Supabase project and that the database is reachable`,
        504,
      );
    }
    throw error;
  }

  walletLogger.info({
    event: "wallet_challenge_issued",
    chain,
    purpose,
    normalizedAddress,
    hasSupabaseUid: Boolean(supabaseUid),
  });

  return {
    nonce,
    message,
    expiresAt,
    chain,
    chainId: Number.isFinite(rawChainId ?? NaN) ? rawChainId ?? null : null,
    chainNamespace: chainNamespace ?? null,
    createdAt: issuedAt,
  } satisfies WalletChallengeResult;
}

type WalletChallengeRow = {
  id: number;
  chain: SupportedChain;
  chain_id: number | null;
  address: string;
  normalized_address: string;
  purpose: WalletChallengePurpose;
  nonce: string;
  message: string;
  expires_at: string;
  created_at: string;
  used: boolean;
  supabase_uid?: string | null;
  user_id?: number | null;
};

type VerifyWalletLoginParams = {
  chain: SupportedChain;
  address: string;
  nonce: string;
  signature: string;
  signatureEncoding?: string | null;
  rateLimitKey: string;
};

export type WalletLoginResult = {
  session: Session;
  user: User;
};

async function enforceWalletRateLimit(key: string) {
  const { success, headers } = await checkRateLimit(key, walletVerifyRateLimit);
  if (!success) {
    throw new WalletRateLimitError(
      "Too many wallet verification attempts. Please try again shortly.",
      headers,
    );
  }
}

export async function verifyWalletLogin({
  chain,
  address,
  nonce,
  signature,
  signatureEncoding,
  rateLimitKey,
}: VerifyWalletLoginParams): Promise<WalletLoginResult> {
  await enforceWalletRateLimit(rateLimitKey);

  const adminClient = safeGetSupabaseAdminClient();
  const normalizedAddress = normalizeWalletAddress(chain, address);

  const { data: challenge, error: challengeError } = await adminClient
    .from("wallet_auth_challenge")
    .select("*")
    .eq("nonce", nonce)
    .eq("normalized_address", normalizedAddress)
    .eq("purpose", "login")
    .eq("used", false)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<WalletChallengeRow>();

  if (challengeError) {
    const message = getErrorMessage(challengeError, "Failed to load wallet challenge");
    throw new WalletRequestError(message, 500);
  }
  if (!challenge) {
    throw new WalletRequestError("Challenge not found or already used", 400);
  }
  if (isWalletChallengeExpired(challenge.expires_at)) {
    throw new WalletRequestError("Challenge has expired", 400);
  }

  const valid = await verifyWalletSignature({
    chain,
    message: challenge.message,
    signature,
    address: challenge.address,
    encoding: signatureEncoding ?? (chain === "solana" ? "base58" : undefined),
  });

  if (!valid) {
    walletLogger.warn({
      event: "wallet_login_invalid_signature",
      chain,
      normalizedAddress,
    });
    throw new WalletRequestError("Invalid wallet signature", 401);
  }

  const walletEmail = generateWalletEmail(chain, normalizedAddress);

  let supabaseUser: User | null = null;

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email: walletEmail,
    email_confirm: true,
    user_metadata: {
      wallet_address: address,
      wallet_chain: chain,
      wallet_chain_id: challenge.chain_id,
    },
    app_metadata: {
      providers: ["wallet"],
      wallet: {
        chain,
        address,
      },
    },
  });

  if (createError && "status" in createError && createError.status !== 422) {
    throw createError;
  }
  if (createError && !("status" in createError)) {
    throw createError;
  }
  if (createdUser?.user) {
    supabaseUser = createdUser.user;
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: walletEmail,
  });

  if (linkError || !linkData?.properties?.email_otp) {
    throw linkError ?? new Error("Unable to generate wallet login token");
  }
  if (!supabaseUser && linkData.user) {
    supabaseUser = linkData.user as User;
  }

  const magicOtp = linkData.properties.email_otp;
  const anonClient = getSupabaseServerAnonClient();
  const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
    email: walletEmail,
    token: magicOtp,
    type: "magiclink",
  });

  if (verifyError || !verifyData?.session) {
    const message = getErrorMessage(verifyError, "Failed to mint Supabase session for wallet user");
    throw new WalletRequestError(message, 500);
  }

  const session = verifyData.session;
  const resolvedUser = supabaseUser ?? session.user ?? null;

  if (!resolvedUser) {
    throw new Error("Unable to resolve wallet user after verification");
  }

  const challengeUpdate: Record<string, UntypedJson> = { used: true };
  const supabaseUid = typeof resolvedUser.id === "string" ? resolvedUser.id : null;

  if (supabaseUid) {
    challengeUpdate.supabase_uid = supabaseUid;
    const dbUserId = await resolveAppUserId(adminClient, supabaseUid);
    if (typeof dbUserId === "number") {
      challengeUpdate.user_id = dbUserId;
    }
  }

  const { error: updateError } = await adminClient
    .from("wallet_auth_challenge")
    .update(challengeUpdate)
    .eq("id", challenge.id);

  if (updateError) {
    const message = getErrorMessage(updateError, "Failed to mark wallet challenge as used");
    throw new WalletRequestError(message, 500);
  }

  walletLogger.info({
    event: "wallet_login_success",
    chain,
    normalizedAddress,
    supabaseUid: resolvedUser.id,
  });

  return {
    session,
    user: resolvedUser,
  } satisfies WalletLoginResult;
}

type VerifyWalletLinkParams = {
  chain: SupportedChain;
  address: string;
  nonce: string;
  signature: string;
  signatureEncoding?: string | null;
  rateLimitKey: string;
  supabaseUid: string;
};

export type WalletLinkResult = {
  chain: SupportedChain;
  address: string;
  normalizedAddress: string;
  nonce: string;
};

export async function verifyWalletLink({
  chain,
  address,
  nonce,
  signature,
  signatureEncoding,
  rateLimitKey,
  supabaseUid,
}: VerifyWalletLinkParams): Promise<WalletLinkResult> {
  await enforceWalletRateLimit(rateLimitKey);

  const adminClient = safeGetSupabaseAdminClient();
  const normalizedAddress = normalizeWalletAddress(chain, address);

  const { data: challenge, error: challengeError } = await adminClient
    .from("wallet_auth_challenge")
    .select("*")
    .eq("nonce", nonce)
    .eq("normalized_address", normalizedAddress)
    .eq("purpose", "link")
    .eq("used", false)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<WalletChallengeRow>();

  if (challengeError) {
    const message = getErrorMessage(challengeError, "Failed to load wallet challenge");
    throw new WalletRequestError(message, 500);
  }
  if (!challenge) {
    throw new WalletRequestError("Challenge not found or already used", 400);
  }
  if (challenge.supabase_uid && challenge.supabase_uid !== supabaseUid) {
    throw new WalletRequestError("Challenge does not belong to user", 403);
  }
  if (isWalletChallengeExpired(challenge.expires_at)) {
    throw new WalletRequestError("Challenge has expired", 400);
  }

  const signatureValid = await verifyWalletSignature({
    chain,
    message: challenge.message,
    signature,
    address: challenge.address,
    encoding: signatureEncoding ?? (chain === "solana" ? "base58" : undefined),
  });

  if (!signatureValid) {
    walletLogger.warn({
      event: "wallet_link_invalid_signature",
      chain,
      normalizedAddress,
      supabaseUid,
    });
    throw new WalletRequestError("Invalid wallet signature", 401);
  }

  const updatePayload: Record<string, UntypedJson> = {
    used: true,
    supabase_uid: supabaseUid,
  };

  if (typeof challenge.user_id !== "number") {
    const appUserId = await resolveAppUserId(adminClient, supabaseUid);
    if (typeof appUserId === "number") {
      updatePayload.user_id = appUserId;
    }
  }

  const { error: updateError } = await adminClient
    .from("wallet_auth_challenge")
    .update(updatePayload)
    .eq("id", challenge.id);

  if (updateError) {
    const message = getErrorMessage(updateError, "Failed to update wallet challenge");
    throw new WalletRequestError(message, 500);
  }

  walletLogger.info({
    event: "wallet_link_success",
    chain,
    normalizedAddress,
    supabaseUid,
  });

  return {
    chain,
    address: challenge.address,
    normalizedAddress,
    nonce: challenge.nonce,
  } satisfies WalletLinkResult;
}
