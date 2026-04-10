// Domain: security
// Responsibility: Enforce Supabase MFA assurance level (AAL2) for high-risk actions.
// Depends on: VerifiedSupabaseSession (server auth)
// Notes:
// - Supabase includes `aal` (e.g. "aal2") and/or `amr` in JWT claims when MFA is complete.
// - In E2E test mode we allow bypass to keep flows deterministic.

import { NextResponse } from "next/server";

import type { VerifiedSupabaseSession } from "@/server/auth/session";

type AssuranceResult = { ok: true } | { ok: false; response: NextResponse };

function isAal2FromClaims(claims: Record<string, UntypedJson> | null | undefined): boolean {
  if (!claims) return false;

  const aal = claims["aal"];
  if (typeof aal === "string" && aal.toLowerCase() === "aal2") return true;

  const amr = claims["amr"];
  if (Array.isArray(amr)) {
    const normalized = amr.map((entry) => (typeof entry === "string" ? entry.toLowerCase() : "")).filter(Boolean);
    if (normalized.includes("mfa")) return true;
  }

  return false;
}

export function requireAal2FromClaims(claims: Record<string, UntypedJson> | null | undefined): AssuranceResult {
  if (process.env.E2E_TEST_MODE === "true") {
    return { ok: true };
  }

  if (!isAal2FromClaims(claims)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "mfa_required",
          message: "Multi-factor authentication (AAL2) is required for this action.",
          hint: "Complete /auth/2fa verification and retry.",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

export function requireAal2(session: VerifiedSupabaseSession | null): AssuranceResult {
  if (process.env.E2E_TEST_MODE === "true") {
    return { ok: true };
  }

  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  return requireAal2FromClaims(session.claims);
}
