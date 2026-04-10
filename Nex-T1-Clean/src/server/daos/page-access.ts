import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { logger } from "@/lib/logger";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import {
  getNonProductionTestModeOrgId,
  isNonProductionTestMode,
} from "@/server/auth/test-mode";
import { ensureActiveOrg } from "@/server/organization/active-org";

const DEFAULT_TEST_MODE_USER_ID = "00000000-0000-0000-0000-000000000000";

export type DaoPageAccess = {
  userId: string;
  orgId: string;
  hasAuthenticatedSession: boolean;
  isTestModePreview: boolean;
};

function readTestModeUserId(): string {
  const configured = process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID?.trim();
  return configured && configured.length > 0
    ? configured
    : DEFAULT_TEST_MODE_USER_ID;
}

export async function resolveDaoPageAccess(nextPath: string): Promise<DaoPageAccess> {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const testMode = isNonProductionTestMode({ cookies: jar });

  let userId: string | null = null;

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, {
      refreshSession: false,
    });
    userId = context?.userId ?? null;
  } catch (error) {
    logger.error("dao_page_auth_context_failed", {
      nextPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!userId) {
    if (testMode) {
      return {
        userId: readTestModeUserId(),
        orgId: getNonProductionTestModeOrgId({ cookies: jar }),
        hasAuthenticatedSession: false,
        isTestModePreview: true,
      };
    }

    redirect(`/auth?view=sign-in&next=${nextPath}`);
  }

  const activeOrg = await ensureActiveOrg({
    cookieSource: cookieBridge,
    userId,
    validateExisting: true,
  });

  if (!activeOrg.ok) {
    if (testMode) {
      return {
        userId,
        orgId: getNonProductionTestModeOrgId({ cookies: jar }),
        hasAuthenticatedSession: false,
        isTestModePreview: true,
      };
    }

    redirect(`/auth?view=sign-in&next=${nextPath}`);
  }

  return {
    userId,
    orgId: activeOrg.orgId,
    hasAuthenticatedSession: true,
    isTestModePreview: false,
  };
}
