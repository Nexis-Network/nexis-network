import { randomUUID } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { isRedisConfigured, redis } from "@/server/services/redis";
import {
  hashTransactionApprovalPayload,
  type TransactionApprovalAction,
  type WalletSendPayload,
} from "@/server/security/transaction-approval-payload";

const STEP_UP_TTL_SECONDS = Number(process.env.STEP_UP_TOKEN_TTL_SECONDS ?? 90);

type StepUpTokenClaims = {
  userId: string;
  action: TransactionApprovalAction;
  payloadHash: string;
  issuedAt: number;
};

const consumedJtis = new Map<string, number>();

function purgeExpiredJtis(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, expiresAt] of consumedJtis.entries()) {
    if (expiresAt <= now) {
      consumedJtis.delete(jti);
    }
  }
}

function getJwtSecret(): Uint8Array {
  const raw =
    process.env.STEP_UP_TOKEN_JWT_SECRET?.trim() ||
    process.env.WALLET_PASSKEY_CHALLENGE_JWT_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (!raw) {
    throw new Error(
      "Missing STEP_UP_TOKEN_JWT_SECRET (or WALLET_PASSKEY_CHALLENGE_JWT_SECRET / JWT_SECRET fallback)",
    );
  }

  return new TextEncoder().encode(raw);
}

function buildRedisStepUpKey(token: string): string {
  return `step_up:token:${token}`;
}

export async function issueStepUpToken(params: {
  userId: string;
  action: TransactionApprovalAction;
  payloadHash: string;
}): Promise<{ token: string; expiresIn: number }> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const tokenId = randomUUID();
  const payload: StepUpTokenClaims = {
    userId: params.userId,
    action: params.action,
    payloadHash: params.payloadHash,
    issuedAt,
  };

  if (isRedisConfigured) {
    await redis.set(buildRedisStepUpKey(tokenId), payload, {
      ex: STEP_UP_TTL_SECONDS,
    });
    return { token: tokenId, expiresIn: STEP_UP_TTL_SECONDS };
  }

  const token = await new SignJWT({ ...payload, jti: tokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + STEP_UP_TTL_SECONDS)
    .setJti(tokenId)
    .sign(getJwtSecret());

  return { token, expiresIn: STEP_UP_TTL_SECONDS };
}

export async function verifyStepUpToken(params: {
  token?: string | null;
  userId: string;
  action: TransactionApprovalAction;
  payload: WalletSendPayload;
}): Promise<StepUpTokenClaims | null> {
  const token = params.token?.trim();
  if (!token) {
    return null;
  }

  const expectedPayloadHash = hashTransactionApprovalPayload(
    params.action,
    params.payload,
  );

  if (isRedisConfigured) {
    const key = buildRedisStepUpKey(token);
    const stored = await redis.get<StepUpTokenClaims>(key);
    if (!stored) {
      return null;
    }
    await redis.del(key);
    if (
      stored.userId !== params.userId ||
      stored.action !== params.action ||
      stored.payloadHash !== expectedPayloadHash
    ) {
      return null;
    }
    return stored;
  }

  let payload;
  try {
    const result = await jwtVerify(token, getJwtSecret());
    payload = result.payload;
  } catch {
    return null;
  }

  const userId = typeof payload.userId === "string" ? payload.userId : null;
  const action =
    payload.action === "wallets:send" ? payload.action : null;
  const payloadHash =
    typeof payload.payloadHash === "string" ? payload.payloadHash : null;
  const jti = typeof payload.jti === "string" ? payload.jti : null;

  if (!userId || !action || !payloadHash) {
    return null;
  }

  if (
    userId !== params.userId ||
    action !== params.action ||
    payloadHash !== expectedPayloadHash
  ) {
    return null;
  }

  if (jti) {
    purgeExpiredJtis();
    if (consumedJtis.has(jti)) {
      return null;
    }
    const expiresAt =
      typeof payload.exp === "number"
        ? payload.exp
        : Math.floor(Date.now() / 1000) + STEP_UP_TTL_SECONDS;
    consumedJtis.set(jti, expiresAt);
  }

  return {
    userId,
    action,
    payloadHash,
    issuedAt:
      typeof payload.iat === "number"
        ? payload.iat
        : Math.floor(Date.now() / 1000),
  };
}
