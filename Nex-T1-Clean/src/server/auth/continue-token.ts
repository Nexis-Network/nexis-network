import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 15 * 60;

export type ContinueTokenPayload = {
  path: string;
  issuedAt: number;
  expiresAt: number;
};

function getSecret(): string | null {
  const secret = process.env.NEX_CONTINUE_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

export function createContinueToken(path: string, ttlSeconds = DEFAULT_TTL_SECONDS): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload: ContinueTokenPayload = {
    path,
    issuedAt: now,
    expiresAt: now + Math.max(30, ttlSeconds),
  };
  const serialized = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret).update(serialized).digest("hex");
  return Buffer.from(`${serialized}.${hmac}`, "utf8").toString("base64url");
}

export function verifyContinueToken(token: string | null | undefined): ContinueTokenPayload | null {
  if (!token) return null;
  const secret = getSecret();
  if (!secret) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [payloadStr, signature] = decoded.split(".");
    if (!payloadStr || !signature) return null;
    const expected = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(payloadStr) as ContinueTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt < now) return null;
    return payload;
  } catch {
    return null;
  }
}
