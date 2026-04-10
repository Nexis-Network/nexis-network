import crypto from "node:crypto";

import type { CookieBridge } from "@/server/auth/cookie-bridge";

const CREATE_GUEST_COOKIE = "create_guest_id";
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

type GuestCookiePayload = {
  id: string;
  issuedAt: number;
  expiresAt: number;
};

function getSecret(): string {
  const candidate =
    process.env.CREATE_GUEST_COOKIE_SECRET?.trim() ||
    process.env.NEX_CONTINUE_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();

  if (!candidate || candidate.length < 16) {
    throw new Error("Missing CREATE_GUEST_COOKIE_SECRET (or fallback secret)");
  }

  return candidate;
}

function encodePayload(payload: GuestCookiePayload): string {
  const serialized = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(serialized)
    .digest("hex");

  return Buffer.from(`${serialized}.${signature}`, "utf8").toString("base64url");
}

function decodePayload(token: string): GuestCookiePayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [payloadStr, signature] = decoded.split(".");
    if (!payloadStr || !signature) {
      return null;
    }

    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payloadStr)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const payload = JSON.parse(payloadStr) as GuestCookiePayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.expiresAt < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getCreateGuestCookieName(): string {
  return CREATE_GUEST_COOKIE;
}

export function readCreateGuestSessionId(cookieBridge: CookieBridge): string | null {
  const token = cookieBridge
    .getAll()
    .find((cookie) => cookie.name === CREATE_GUEST_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return decodePayload(token)?.id ?? null;
}

export function createGuestSessionId(): string {
  return crypto.randomUUID();
}

export function stageCreateGuestSessionCookie(
  cookieBridge: CookieBridge,
  guestSessionId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): void {
  const now = Math.floor(Date.now() / 1000);
  const token = encodePayload({
    id: guestSessionId,
    issuedAt: now,
    expiresAt: now + ttlSeconds,
  });

  cookieBridge.setAll([
    {
      name: CREATE_GUEST_COOKIE,
      value: token,
      options: {
        httpOnly: true,
        maxAge: ttlSeconds,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  ]);
}

export function clearCreateGuestSessionCookie(cookieBridge: CookieBridge): void {
  cookieBridge.setAll([
    {
      name: CREATE_GUEST_COOKIE,
      value: "",
      options: {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  ]);
}
