// Domain: wallets (Safe)
// Responsibility: WebAuthn helpers for wallet passkeys (registration/auth verification).
// Depends on: @simplewebauthn/server
// Notes:
// - This is separate from Supabase Auth WebAuthn (login). This is wallet-scoped passkeys.
// - Always bind to expected origin + rpID.
// - Never log credential raw payloads.

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";

export type RpConfig = {
  rpName: string;
  rpID: string;
  origin: string;
};

const PUBLIC_ORIGIN_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "SITE_URL",
  "VERCEL_URL",
] as const;

/**
 * Normalize hostname for WebAuthn RP ID.
 * WebAuthn requires a valid registrable domain - IPv6 addresses like "[::]" are invalid.
 * This normalizes localhost variants to "localhost" for local development compatibility.
 */
function normalizeRpId(hostname: string): string {
  // IPv6 localhost variants
  if (hostname === "[::]" || hostname === "[::1]" || hostname === "::1") {
    return "localhost";
  }
  // IPv4 localhost
  if (hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    return "localhost";
  }
  return hostname;
}

function firstHeaderValue(value: string | null): string | null {
  const trimmed = value?.split(",")[0]?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::]" ||
    hostname === "[::1]" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function normalizeOriginCandidate(candidate: string | null | undefined): string | null {
  const trimmed = candidate?.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//iu.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return null;
    }
  }

  const protocol = isLocalHostname(trimmed) ? "http" : "https";
  try {
    return new URL(`${protocol}://${trimmed}`).origin;
  } catch {
    return null;
  }
}

function resolvePublicOrigin(request: Request): string {
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto")) ?? "https";
  const forwardedHost =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));
  const forwardedOrigin = forwardedHost
    ? normalizeOriginCandidate(`${forwardedProto}://${forwardedHost}`)
    : null;
  if (forwardedOrigin) {
    return forwardedOrigin;
  }

  const requestOrigin = new URL(request.url).origin;
  const requestHostname = new URL(requestOrigin).hostname;
  if (!isLocalHostname(requestHostname)) {
    return requestOrigin;
  }

  for (const key of PUBLIC_ORIGIN_ENV_KEYS) {
    const rawValue =
      key === "VERCEL_URL" && process.env[key]
        ? `https://${process.env[key]}`
        : process.env[key];
    const normalized = normalizeOriginCandidate(rawValue);
    if (normalized) {
      const hostname = new URL(normalized).hostname;
      if (isLocalHostname(hostname)) {
        continue;
      }
      return normalized;
    }
  }

  return requestOrigin;
}

/**
 * Normalize origin for WebAuthn to match the normalized RP ID.
 * This ensures origin validation succeeds when using localhost.
 */
function normalizeOrigin(origin: string, originalHostname: string, normalizedRpId: string): string {
  if (originalHostname !== normalizedRpId) {
    // Replace the hostname in the origin with the normalized RP ID
    const url = new URL(origin);
    url.hostname = normalizedRpId;
    return url.origin;
  }
  return origin;
}

export function resolveRpConfigFromRequest(request: Request): RpConfig {
  const publicOrigin = resolvePublicOrigin(request);
  const publicUrl = new URL(publicOrigin);
  const originalHostname = publicUrl.hostname;
  const rpID = normalizeRpId(originalHostname);
  const origin = normalizeOrigin(publicUrl.origin, originalHostname, rpID);
  return {
    rpName: "Nex-T1",
    rpID,
    origin,
  };
}

export async function createRegistrationOptions(params: {
  rp: RpConfig;
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentialIds: string[];
}): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; challenge: string }> {
  const { rp, userId, userName, userDisplayName, excludeCredentialIds } = params;
  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userID: new TextEncoder().encode(userId),
    userName,
    userDisplayName,
    timeout: 60_000,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: excludeCredentialIds.map((id) => ({ id, type: "public-key" })),
  });
  return { options, challenge: options.challenge ?? "" };
}

export function verifyRegistration(params: {
  rp: RpConfig;
  expectedChallenge: string;
  response: RegistrationResponseJSON;
}): Promise<VerifiedRegistrationResponse> {
  const { rp, expectedChallenge, response } = params;
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: false,
  });
}

export async function createAuthenticationOptions(params: {
  rp: RpConfig;
  allowCredentialIds: string[];
  challenge?: Uint8Array;
  userVerification?: "preferred" | "required" | "discouraged";
}): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; challenge: string }> {
  const { rp, allowCredentialIds } = params;
  const challenge = params.challenge ? new Uint8Array(params.challenge) : undefined;
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    timeout: 60_000,
    userVerification: params.userVerification ?? "preferred",
    allowCredentials: allowCredentialIds.map((id) => ({ id, type: "public-key" })),
    challenge,
  });
  return { options, challenge: options.challenge ?? "" };
}

export function verifyAuthentication(params: {
  rp: RpConfig;
  expectedChallenge: string;
  response: AuthenticationResponseJSON;
  credential: {
    id: string;
    publicKey: Uint8Array<ArrayBuffer>;
    counter: number;
  };
  requireUserVerification?: boolean;
}): Promise<VerifiedAuthenticationResponse> {
  const { rp, expectedChallenge, response, credential } = params;
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: params.requireUserVerification ?? false,
    credential: {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
    },
  });
}

export type { VerifiedRegistrationResponse, VerifiedAuthenticationResponse };
