import { NextResponse, type NextRequest } from "next/server";

import { getVerifiedSupabaseSession, type VerifiedSupabaseSession } from "@/server/auth/session";
import {
  getNonProductionTestModeOrgId,
  isNonProductionTestMode,
} from "@/server/auth/test-mode";
import { ensureActiveOrg } from "@/server/organization/active-org";

export type WithAuthOptions = {
  allowPublic?: boolean;
  requireOrg?: boolean;
};

export type WithAuthResult =
  | { ok: true; session: VerifiedSupabaseSession | null; orgId: string | null }
  | { ok: false; response: NextResponse };

const unauthorized = () =>
  NextResponse.json({ error: "unauthorized" }, { status: 401 });

const ORG_OPTIONAL_PATH_PREFIXES = ["/api/chat"] as const;

function isOrgOptionalRequest(request: NextRequest | Request): boolean {
  try {
    const pathname =
      "nextUrl" in request && (request as NextRequest).nextUrl
        ? (request as NextRequest).nextUrl.pathname
        : new URL(request.url).pathname;

    return ORG_OPTIONAL_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  } catch {
    return false;
  }
}

export async function withAuth(request: NextRequest | Request, options: WithAuthOptions = {}): Promise<WithAuthResult> {
  const { allowPublic = false, requireOrg = true } = options;
  const effectiveRequireOrg = requireOrg && !isOrgOptionalRequest(request);
  const testMode = isNonProductionTestMode({ request });

  const session = await getVerifiedSupabaseSession({ request });

  if (!session) {
    if (testMode) {
      return {
        ok: true,
        session: null,
        orgId: getNonProductionTestModeOrgId({ request }),
      };
    }
    return allowPublic ? { ok: true, session: null, orgId: null } : { ok: false, response: unauthorized() };
  }

  const cookieStore = "cookies" in request ? (request as NextRequest).cookies : null;
  let orgId = cookieStore?.get("org_active_account")?.value?.trim() ?? null;

  if (effectiveRequireOrg && !orgId) {
    if (testMode) {
      return { ok: true, session, orgId: "test-org" };
    }

    const orgResolution = await ensureActiveOrg({
      cookieSource: cookieStore ?? undefined,
      userId: session.user.id,
    });
    if (!orgResolution.ok) {
      return { ok: false, response: orgResolution.response as NextResponse };
    }
    orgId = orgResolution.orgId;
  }

  return { ok: true, session, orgId };
}
