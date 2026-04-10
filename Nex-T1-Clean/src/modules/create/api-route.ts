import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { V0ClientError } from "@/lib/v0/errors";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { ensureActiveOrg } from "@/server/organization/active-org";
import { withAuth, type WithAuthResult } from "@/server/security/with-auth";

import { resolveCreateActor } from "./actor";
import { CreateServiceError } from "./errors";
import {
  createGuestSessionId,
  stageCreateGuestSessionCookie,
} from "./guest-cookie";
import type { ResolvedCreateActor } from "./types";

type ResolvedAuthedContext = Extract<WithAuthResult, { ok: true }>;
type CreateMutableActor = Exclude<ResolvedCreateActor, { kind: "anonymous" }>;

export type CreateRouteContext = {
  actor: ResolvedCreateActor;
  auth: ResolvedAuthedContext;
  cookieBridge: ReturnType<typeof createCookieBridge>;
};

function withResolvedOrg(
  auth: ResolvedAuthedContext,
  orgId: string,
): ResolvedAuthedContext {
  return {
    ...auth,
    orgId,
  };
}

export async function resolveCreateRouteContext(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      value: CreateRouteContext;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const auth = await withAuth(request, { allowPublic: true, requireOrg: false });

  if (!auth.ok) {
    return {
      ok: false,
      response: cookieBridge.commit(auth.response),
    };
  }

  let resolvedAuth = auth;
  const userId = auth.session?.user.id;

  if (userId && !auth.orgId) {
    const orgResult = await ensureActiveOrg({
      cookieSource: cookieBridge,
      userId,
    });

    if (!orgResult.ok) {
      return {
        ok: false,
        response: cookieBridge.commit(orgResult.response),
      };
    }

    resolvedAuth = withResolvedOrg(auth, orgResult.orgId);
  }

  const actor = await resolveCreateActor({
    auth: resolvedAuth,
    cookieBridge,
    request,
  });

  return {
    ok: true,
    value: {
      actor,
      auth: resolvedAuth,
      cookieBridge,
    },
  };
}

export function ensureMutableCreateActor(
  actor: ResolvedCreateActor,
  cookieBridge: ReturnType<typeof createCookieBridge>,
): CreateMutableActor {
  if (actor.kind !== "anonymous") {
    return actor;
  }

  const guestSessionId = createGuestSessionId();
  stageCreateGuestSessionCookie(cookieBridge, guestSessionId);

  return {
    kind: "guest",
    guestSessionId,
    ip: actor.ip,
  };
}

export function mapCreateRouteError(error: unknown): Response {
  if (error instanceof CreateServiceError) {
    return apiResponse.error(
      error.code,
      error.message,
      error.status,
      error.details,
    );
  }

  if (error instanceof V0ClientError) {
    return apiResponse.error(error.code, error.message, error.status);
  }

  return apiResponse.internalError(
    error instanceof Error ? error.message : "Unexpected create builder error.",
  );
}
