import { NextRequest } from 'next/server';
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { isSandboxOwnedByUser } from "@/server/services/e2b/sandbox-session";
import { getErrorMessage } from "@/lib/utils/error";

import { isBlockedSandboxCommand, SandboxCommandSchema } from "./route.schema";
import { runSandboxCommand } from "./route.service";

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

    const parsed = SandboxCommandSchema.safeParse(body);
    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.badRequest("Missing required fields"));
    }
    const { sandboxId, command, stream } = parsed.data;

    if (isBlockedSandboxCommand(command)) {
      return cookieBridge.commit(
        apiResponse.badRequest("Command contains blocked operations", "UNSAFE_COMMAND")
      );
    }

    const isOwned = await isSandboxOwnedByUser(userId, sandboxId);
    if (!isOwned) {
      return cookieBridge.commit(apiResponse.forbidden("Sandbox access denied"));
    }

    try {
      const result = await runSandboxCommand({
        command,
        e2bApiKey,
        sandboxId,
        stream,
      });

      if (!(result instanceof Response)) {
        return cookieBridge.commit(apiResponse.success(result));
      }

      return cookieBridge.commit(result);
    } catch (error: UntypedJson) {
      const message = getErrorMessage(error, "Command execution failed");
      logger.error('[sandbox/command] Error:', message);
      return cookieBridge.commit(apiResponse.internalError(message));
    }
  });
}
