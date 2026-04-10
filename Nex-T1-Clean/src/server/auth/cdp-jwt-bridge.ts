/**
 * CDP JWT Bridge — HS256 → RS256
 *
 * Supabase (Railway) signs sessions with HS256 (symmetric HMAC).
 * CDP Custom Auth requires RS256 (asymmetric) verification via JWKS.
 *
 * This module:
 * 1. Loads RSA key pair from environment (PEM format)
 * 2. Mints RS256 JWTs for authenticated Supabase users
 * 3. Exports the public key(s) as a JWK Set for the JWKS endpoint
 *
 * Key rotation: Supports dual keys via CDP_JWT_RSA_PRIVATE_KEY + CDP_JWT_RSA_PRIVATE_KEY_2
 * with CDP_JWT_ACTIVE_KID selector. Both public keys are served in JWKS during rotation.
 */

import "server-only";

import {
  SignJWT,
  importPKCS8,
  importSPKI,
  exportJWK,
  type JWK,
  type KeyLike,
} from "jose";

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CdpJwtClaims = {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  email?: string;
};

export type CdpJwkSet = {
  keys: JWK[];
};

type KeySlot = {
  kid: string;
  privateKey: KeyLike;
  publicKey: KeyLike;
  publicJwk: JWK;
};

// ---------------------------------------------------------------------------
// Singleton key cache
// ---------------------------------------------------------------------------

let keySlots: KeySlot[] | null = null;
let activeKid: string | null = null;

/**
 * Normalize a PEM string that may have been stored as a single-line env var.
 * Railway/Vercel often strip newlines; we restore them.
 */
function normalizePem(raw: string): string {
  // If the PEM already has newlines, return as-is
  if (raw.includes("\n")) return raw.trim();

  // Handle escaped newlines (\n as literal backslash-n)
  const withNewlines = raw.replace(/\\n/g, "\n").trim();
  if (withNewlines.includes("\n")) return withNewlines;

  // Handle space-separated or fully concatenated single-line PEM.
  // Extract header, body, and footer, then re-wrap the Base64 body at 64 chars.
  const pemMatch = withNewlines.match(
    /^(-----BEGIN [A-Z ]+-----)\s*([\s\S]+?)\s*(-----END [A-Z ]+-----)$/,
  );
  if (pemMatch) {
    const header = pemMatch[1];
    // Strip all whitespace from body and re-wrap at 64-char lines
    const body = pemMatch[2].replace(/\s+/g, "").replace(/.{1,64}/g, "$&\n");
    const footer = pemMatch[3];
    return `${header}\n${body}${footer}`;
  }

  // Fallback: return as-is and let jose report a clear error
  return withNewlines;
}

async function loadKeySlot(
  privateKeyPem: string,
  publicKeyPem: string,
  kid: string,
): Promise<KeySlot> {
  const normalizedPrivate = normalizePem(privateKeyPem);
  const normalizedPublic = normalizePem(publicKeyPem);

  const privateKey = await importPKCS8(normalizedPrivate, "RS256");
  const publicKey = await importSPKI(normalizedPublic, "RS256");
  const publicJwk = await exportJWK(publicKey);

  // Tag with key ID and algorithm
  publicJwk.kid = kid;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";

  return { kid, privateKey, publicKey, publicJwk };
}

let _ensureKeysPromise: Promise<{ slots: KeySlot[]; activeKid: string }> | null = null;

async function ensureKeys(): Promise<{ slots: KeySlot[]; activeKid: string }> {
  if (keySlots && activeKid) {
    return { slots: keySlots, activeKid };
  }

  // Deduplicate concurrent initialization (cold-start race safety)
  if (!_ensureKeysPromise) {
    _ensureKeysPromise = _loadKeys().catch((err) => {
      _ensureKeysPromise = null; // Allow retry on failure
      throw err;
    });
  }
  return _ensureKeysPromise;
}

async function _loadKeys(): Promise<{ slots: KeySlot[]; activeKid: string }> {
  const slots: KeySlot[] = [];

  const pk1 = process.env.CDP_JWT_RSA_PRIVATE_KEY;
  const pub1 = process.env.CDP_JWT_RSA_PUBLIC_KEY;
  if (pk1 && pub1) {
    slots.push(await loadKeySlot(pk1, pub1, "cdp-key-1"));
  }

  // Optional rotation key
  const pk2 = process.env.CDP_JWT_RSA_PRIVATE_KEY_2;
  const pub2 = process.env.CDP_JWT_RSA_PUBLIC_KEY_2;
  if (pk2 && pub2) {
    slots.push(await loadKeySlot(pk2, pub2, "cdp-key-2"));
  }

  if (slots.length === 0) {
    throw new Error(
      "CDP JWT Bridge: No RSA keys configured. Set CDP_JWT_RSA_PRIVATE_KEY and CDP_JWT_RSA_PUBLIC_KEY.",
    );
  }

  const resolvedKid = process.env.CDP_JWT_ACTIVE_KID ?? slots[0].kid;

  // Validate KID against loaded slots at init time, not at mint time
  const activeSlot = slots.find((s) => s.kid === resolvedKid);
  if (!activeSlot) {
    throw new Error(
      `CDP JWT Bridge: CDP_JWT_ACTIVE_KID="${resolvedKid}" does not match any loaded key (loaded: ${slots.map((s) => s.kid).join(", ")}).`,
    );
  }

  keySlots = slots;
  activeKid = resolvedKid;

  return { slots: keySlots, activeKid };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Mint a short-lived RS256 JWT for CDP Custom Auth.
 *
 * @param userId  Supabase user.id (stable UUID) — becomes `sub`
 * @param email   Optional email for the claims
 */
export async function mintCdpJwt(
  userId: string,
  email?: string | null,
): Promise<string> {
  const { slots, activeKid: kid } = await ensureKeys();
  const slot = slots.find((s) => s.kid === kid);
  if (!slot) {
    throw new Error(`CDP JWT Bridge: Active key "${kid}" not found in loaded key slots.`);
  }

  const issuer = process.env.CDP_JWT_ISSUER ?? "https://nex-t1.ai";
  const audience = process.env.CDP_JWT_AUDIENCE ?? "cdp";
  const ttlSeconds = Number(process.env.CDP_JWT_TTL_SECONDS ?? 300);

  const now = Math.floor(Date.now() / 1000);

  const builder = new SignJWT({
    ...(email ? { email } : {}),
  })
    .setProtectedHeader({ alg: "RS256", kid: slot.kid })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds);

  const token = await builder.sign(slot.privateKey);

  logger.debug("cdp_jwt_minted", { userId, kid: slot.kid, ttl: ttlSeconds });

  return token;
}

/**
 * Return the JWK Set containing all public keys.
 * Both active and rotation keys are included so CDP can verify
 * tokens signed by either key during a rotation window.
 */
export async function getCdpJwks(): Promise<CdpJwkSet> {
  const { slots } = await ensureKeys();
  return {
    keys: slots.map((s) => s.publicJwk),
  };
}

/**
 * Return the active key ID (kid).
 * Used by server-side CDP provisioning to register the correct `kid`
 * in the `DeveloperJWTAuthentication` method for new end users.
 */
export async function getActiveCdpKid(): Promise<string> {
  const { activeKid: kid } = await ensureKeys();
  return kid;
}

/**
 * Reset key cache — for testing only.
 */
export function resetCdpKeyCache(): void {
  keySlots = null;
  activeKid = null;
}

// ---------------------------------------------------------------------------
// Agent JWT helpers
// ---------------------------------------------------------------------------

/**
 * Build the CDP sub claim for an agent wallet.
 *
 * Format: `nex-agent:{agentId}:v{generation}`
 *
 * This deterministic sub is used both during provisioning (registered with CDP)
 * and at runtime (embedded in minted JWTs) so CDP can match the token to the
 * correct end-user record.
 */
export function buildAgentCdpSub(agentId: string, generation: number): string {
  return `nex-agent:${agentId}:v${generation}`;
}

/**
 * Mint a short-lived RS256 JWT for CDP Custom Auth scoped to an agent.
 *
 * Uses the same issuer, audience, TTL, and active key slot as `mintCdpJwt`
 * but sets `sub` to the agent-scoped format: `nex-agent:{agentId}:v{generation}`.
 *
 * @param agentId    The agent's unique identifier
 * @param generation The wallet generation (incremented on ownership transfer)
 */
export async function mintAgentCdpJwt(
  agentId: string,
  generation: number,
): Promise<string> {
  const { slots, activeKid: kid } = await ensureKeys();
  const slot = slots.find((s) => s.kid === kid);
  if (!slot) {
    throw new Error(
      `CDP JWT Bridge: Active key "${kid}" not found in loaded key slots.`,
    );
  }

  const issuer = process.env.CDP_JWT_ISSUER ?? "https://nex-t1.ai";
  const audience = process.env.CDP_JWT_AUDIENCE ?? "cdp";
  const ttlSeconds = Number(process.env.CDP_JWT_TTL_SECONDS ?? 300);

  const sub = buildAgentCdpSub(agentId, generation);
  const now = Math.floor(Date.now() / 1000);

  const builder = new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: slot.kid })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds);

  const token = await builder.sign(slot.privateKey);

  logger.debug("cdp_agent_jwt_minted", {
    agentId,
    generation,
    sub,
    kid: slot.kid,
    ttl: ttlSeconds,
  });

  return token;
}
