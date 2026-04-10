import crypto from "crypto";

import { getErrorMessage } from "@/lib/utils/error";


import { logger } from '@/lib/logger';
const DEFAULT_TTL_SECONDS = 10 * 60;
const COOKIE_NAME = "nex_high_risk";

function getSecret(): string {
  const secret = process.env.NEX_HIGH_RISK_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("NEX_HIGH_RISK_SECRET is required (min 16 chars)");
  }
  return secret;
}

function sign(payload: string): string {
  const secret = getSecret();
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function buildHighRiskCookie(path: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ttlSeconds;
  const payload = JSON.stringify({ path, expiresAt, iat: now });
  const sig = sign(payload);
  const token = Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
  const secure = process.env.NODE_ENV === "production";
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure,
      path: "/",
      maxAge: ttlSeconds,
    },
  };
}

export function verifyHighRiskCookie(token: string | undefined | null, path: string): boolean {
  const secret = process.env.NEX_HIGH_RISK_SECRET?.trim();
  if (!secret) return true; // feature disabled
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [payloadStr, sig] = decoded.split(".");
    if (!payloadStr || !sig) return false;
    if (sign(payloadStr) !== sig) return false;
    const payload = JSON.parse(payloadStr) as { path?: string; expiresAt?: number };
    if (!payload.path || payload.path !== path) return false;
    if (!payload.expiresAt || payload.expiresAt < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("high_risk_verify_failed", getErrorMessage(error, "verify_failed"));
    }
    return false;
  }
}

export function cookieNameHighRisk() {
  return COOKIE_NAME;
}
