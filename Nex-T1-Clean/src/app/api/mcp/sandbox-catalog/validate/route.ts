import { NextRequest } from "next/server";
import { z } from "zod";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  validateMcpForSandbox,
  checkUserMcpConfig,
  getSandboxServerById,
} from "@/lib/mcp/registry";

import { logger } from '@/lib/logger';

// ============================================================================
// Request Schema
// ============================================================================

const ValidateRequestSchema = z.object({
  mcpId: z.string().uuid(),
});

// ============================================================================
// POST /api/mcp/sandbox-catalog/validate
// ============================================================================

/**
 * Validates if an MCP server can be deployed in sandbox for the current user.
 *
 * Checks:
 * 1. Server exists and is sandbox-compatible
 * 2. User has configured all required environment variables
 *
 * @example
 * POST /api/mcp/sandbox-catalog/validate
 * { "mcpId": "uuid-here" }
 *
 * Response:
 * {
 *   "success": true,
 *   "valid": true,
 *   "server": { ... },
 *   "config": {
 *     "hasAllRequired": true,
 *     "missingVars": []
 *   },
 *   "deployment": {
 *     "installCmd": "npm install @modelcontextprotocol/server-github",
 *     "runCmd": "npx -y @modelcontextprotocol/server-github"
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  return withAuthedSupabase(async ({ userId, supabase, cookieBridge }) => {
    // Parse and validate request body
    let body: UntypedJson;
    try {
      body = await req.json();
    } catch {
      return cookieBridge.commit(
        apiResponse.badRequest("Invalid JSON body")
      );
    }

    const parseResult = ValidateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return cookieBridge.commit(
        apiResponse.validationError(parseResult.error)
      );
    }

    const { mcpId } = parseResult.data;

    try {
      // ─────────────────────────────────────────────────────────────────────
      // Step 1: Get server details
      // ─────────────────────────────────────────────────────────────────────
      const server = await getSandboxServerById(supabase, mcpId);
      if (!server) {
        return cookieBridge.commit(
          apiResponse.notFound("MCP server not found or not sandbox-compatible")
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // Step 2: Validate server for sandbox deployment
      // ─────────────────────────────────────────────────────────────────────
      const validation = await validateMcpForSandbox(supabase, mcpId);
      if (!validation) {
        return cookieBridge.commit(
          apiResponse.internalError("Failed to validate MCP server")
        );
      }

      if (!validation.valid) {
        return cookieBridge.commit(
          apiResponse.success({
            valid: false,
            server,
            error: validation.error_message,
          })
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // Step 3: Check user configuration
      // ─────────────────────────────────────────────────────────────────────
      const configCheck = await checkUserMcpConfig(
        supabase,
        userId,
        mcpId
      );

      return cookieBridge.commit(
        apiResponse.success({
          valid: true,
          server,
          config: {
            configured: configCheck?.configured ?? false,
            hasAllRequired: configCheck?.has_all_required ?? false,
            missingVars: configCheck?.missing_vars ?? server.required_env_vars,
            requiredVars: server.required_env_vars,
            optionalVars: server.optional_env_vars,
          },
          deployment: {
            installCmd: validation.install_cmd,
            runCmd: validation.run_cmd,
          },
        })
      );
    } catch (error) {
      logger.error("[mcp/sandbox-catalog/validate] Error:", error);
      return cookieBridge.commit(
        apiResponse.internalError("Failed to validate MCP server")
      );
    }
  });
}
