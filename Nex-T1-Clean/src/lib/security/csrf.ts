import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf_token";
const SIGNED_HEADER = "x-signed-nonce";
const DEFAULT_SKEW_SECONDS = 5 * 60;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySignedNonce(raw: string, secret: string | undefined): boolean {
  if (!secret) return false;
  const parts = raw.split(".");
  if (parts.length < 2) return false;
  const [timestampPart, nonce, signature] = parts;
  const timestamp = Number(timestampPart);
  if (!Number.isFinite(timestamp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > DEFAULT_SKEW_SECONDS) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${timestamp}.${nonce ?? ""}`);
  const expected = hmac.digest("hex");
  return safeEqual(expected, signature ?? "");
}

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(req: NextRequest): string | null {
  return normalizeOrigin(req.url);
}

function isSameOriginBrowserRequest(req: NextRequest): boolean {
  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) {
    return false;
  }

  const originHeader = normalizeOrigin(req.headers.get("origin"));
  if (originHeader) {
    return originHeader === requestOrigin;
  }

  const refererOrigin = normalizeOrigin(req.headers.get("referer"));
  if (refererOrigin) {
    return refererOrigin === requestOrigin;
  }

  const secFetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return true;
  }

  return false;
}

export function requireInternalProtection(
  req: NextRequest,
  options: { skewSeconds?: number; secret?: string } = {}
): NextResponse | null {
  if (process.env.E2E_TEST_MODE === "true") {
    return null;
  }
  const secret =
    options.secret ??
    process.env.INTERNAL_API_SECRET ??
    process.env.TASK_WEBHOOK_SECRET ??
    process.env.NEXTAUTH_SECRET;

  const csrfHeader = req.headers.get(CSRF_HEADER);
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (csrfHeader && csrfCookie && safeEqual(csrfHeader, csrfCookie)) {
    return null;
  }

  if (isSameOriginBrowserRequest(req)) {
    return null;
  }

  const signedNonce = req.headers.get(SIGNED_HEADER);
  if (signedNonce && verifySignedNonce(signedNonce, secret)) {
    return null;
  }

  return NextResponse.json({ error: "forbidden", reason: "csrf_required" }, { status: 403 });
}
