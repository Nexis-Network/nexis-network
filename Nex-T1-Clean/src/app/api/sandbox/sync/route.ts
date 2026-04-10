import { NextRequest } from 'next/server';
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { isSandboxOwnedByUser } from "@/server/services/e2b/sandbox-session";
import { getErrorMessage } from "@/lib/utils/error";

import {
  getSandboxSyncUpdates,
  SandboxSyncSchema,
} from "./route.schema";
import { syncSandboxFiles } from "./route.service";

import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  return withAuthedSupabase(async ({ cookieBridge, userId }) => {
    const e2bApiKey = process.env.E2B_API_KEY;
    if (!e2bApiKey) {
      return cookieBridge.commit(
        apiResponse.serviceUnavailable("E2B sandbox is not configured", "E2B_NOT_CONFIGURED")
      );
    }

    let body: UntypedJson;
    try {
      body = await req.json();
    } catch {
      return cookieBridge.commit(apiResponse.badRequest("Invalid JSON body"));
    }

    const parsed = SandboxSyncSchema.safeParse(body);
    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.badRequest("Invalid sync payload"));
    }
    const { sandboxId, files } = parsed.data;

    const isOwned = await isSandboxOwnedByUser(userId, sandboxId);
    if (!isOwned) {
      return cookieBridge.commit(apiResponse.forbidden("Sandbox access denied"));
    }

    try {
      await syncSandboxFiles({
        e2bApiKey,
        files: getSandboxSyncUpdates(files),
        sandboxId,
      });

      return cookieBridge.commit(apiResponse.success({ success: true }));
    } catch (error: UntypedJson) {
      const message = getErrorMessage(error, "File sync failed");
      logger.error('[sandbox/sync] Error:', message);
      return cookieBridge.commit(apiResponse.internalError(message));
    }
  });
}
