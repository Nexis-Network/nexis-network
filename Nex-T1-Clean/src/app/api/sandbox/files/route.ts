import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { isSandboxOwnedByUser } from "@/server/services/e2b/sandbox-session";
import { getErrorMessage } from "@/lib/utils/error";

import {
  SandboxReadFilesQuerySchema,
  SandboxWriteFileSchema,
} from "./route.schema";
import {
  listSandboxFiles,
  readSandboxFile,
  writeSandboxFile,
} from "./route.service";

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

    const parsed = SandboxWriteFileSchema.safeParse(body);
    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.badRequest("Missing required fields"));
    }
    const { sandboxId, path, content } = parsed.data;

    const isOwned = await isSandboxOwnedByUser(userId, sandboxId);
    if (!isOwned) {
      return cookieBridge.commit(apiResponse.forbidden("Sandbox access denied"));
    }

    try {
      await writeSandboxFile({
        content: content ?? "",
        e2bApiKey,
        path,
        sandboxId,
      });

      return cookieBridge.commit(apiResponse.success({ success: true }));
    } catch (error: UntypedJson) {
      const message = getErrorMessage(error, "File write failed");
      logger.error('[sandbox/files] Error:', message);
      return cookieBridge.commit(apiResponse.internalError(message));
    }
  });
}

export async function GET(req: NextRequest) {
  return withAuthedSupabase(async ({ cookieBridge, userId }) => {
    const e2bApiKey = process.env.E2B_API_KEY;
    if (!e2bApiKey) {
      return cookieBridge.commit(
        apiResponse.serviceUnavailable("E2B sandbox is not configured", "E2B_NOT_CONFIGURED")
      );
    }

    const parsed = SandboxReadFilesQuerySchema.safeParse({
      sandboxId: req.nextUrl.searchParams.get("sandboxId"),
      mode: req.nextUrl.searchParams.get("mode") ?? "list",
      path: req.nextUrl.searchParams.get("path") ?? ".",
    });
    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.badRequest("Invalid file query"));
    }

    const { sandboxId, mode, path } = parsed.data;
    const isOwned = await isSandboxOwnedByUser(userId, sandboxId);
    if (!isOwned) {
      return cookieBridge.commit(apiResponse.forbidden("Sandbox access denied"));
    }

    try {
      if (mode === "read") {
        const content = await readSandboxFile({
          e2bApiKey,
          path,
          sandboxId,
        });
        return cookieBridge.commit(apiResponse.success({ path, content }));
      }

      const files = await listSandboxFiles({
        e2bApiKey,
        path,
        sandboxId,
      });
      return cookieBridge.commit(apiResponse.success({ path, files }));
    } catch (error: UntypedJson) {
      const message = getErrorMessage(error, "File operation failed");
      logger.error('[sandbox/files:get] Error:', message);
      return cookieBridge.commit(apiResponse.internalError(message));
    }
  });
}
