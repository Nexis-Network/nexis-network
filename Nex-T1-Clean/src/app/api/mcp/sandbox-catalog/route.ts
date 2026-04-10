import { connection, NextRequest } from "next/server";
import { z } from "zod";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  getSandboxServers,
  getSandboxServersByCategory,
  getSandboxServerById,
  searchSandboxServers,
  getSandboxCatalog,
  mcpCategorySchema,
  type McpCategory,
} from "@/lib/mcp/registry";

import { logger } from '@/lib/logger';

// ============================================================================
// Query Parameter Schemas
// ============================================================================

const QuerySchema = z.object({
  category: mcpCategorySchema.optional(),
  id: z.string().uuid().optional(),
  search: z.string().min(1).max(100).optional(),
  grouped: z.coerce.boolean().optional(),
});

// ============================================================================
// GET /api/mcp/sandbox-catalog
// ============================================================================

/**
 * Fetches sandbox-compatible MCP servers from Supabase.
 *
 * Query parameters:
 * - category: Filter by category (web3, defi, ai, etc.)
 * - id: Get a specific server by UUID
 * - search: Search servers by name/description
 * - grouped: Return servers grouped by category (for catalog display)
 *
 * @example
 * GET /api/mcp/sandbox-catalog                    // All servers
 * GET /api/mcp/sandbox-catalog?category=web3     // Web3 servers
 * GET /api/mcp/sandbox-catalog?id=<uuid>         // Specific server
 * GET /api/mcp/sandbox-catalog?search=github     // Search
 * GET /api/mcp/sandbox-catalog?grouped=true      // Grouped catalog
 */
export async function GET(req: NextRequest) {
  await connection();
  return withAuthedSupabase(async ({ supabase, cookieBridge }) => {
    // Parse query parameters
    const url = new URL(req.url);
    const queryParams = {
      category: url.searchParams.get("category") ?? undefined,
      id: url.searchParams.get("id") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      grouped: url.searchParams.get("grouped") ?? undefined,
    };

    const parseResult = QuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return cookieBridge.commit(apiResponse.validationError(parseResult.error));
    }

    const { category, id, search, grouped } = parseResult.data;

    try {
      // ─────────────────────────────────────────────────────────────────────
      // Case 1: Get specific server by ID
      // ─────────────────────────────────────────────────────────────────────
      if (id) {
        const server = await getSandboxServerById(supabase, id);
        if (!server) {
          return cookieBridge.commit(apiResponse.notFound("Server not found"));
        }

        return cookieBridge.commit(apiResponse.success({ server }));
      }

      // ─────────────────────────────────────────────────────────────────────
      // Case 2: Search by query
      // ─────────────────────────────────────────────────────────────────────
      if (search) {
        const servers = await searchSandboxServers(supabase, search);

        return cookieBridge.commit(
          apiResponse.success({ servers, count: servers.length })
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // Case 3: Return grouped catalog
      // ─────────────────────────────────────────────────────────────────────
      if (grouped) {
        const catalog = await getSandboxCatalog(supabase);

        // Count total and per-category
        const counts: Record<McpCategory, number> = {} as Record<
          McpCategory,
          number
        >;
        let total = 0;

        for (const [cat, servers] of Object.entries(catalog)) {
          counts[cat as McpCategory] = servers.length;
          total += servers.length;
        }

        return cookieBridge.commit(
          apiResponse.success({ catalog, counts, total })
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // Case 4: Filter by category
      // ─────────────────────────────────────────────────────────────────────
      if (category) {
        const servers = await getSandboxServersByCategory(
          supabase,
          category
        );

        return cookieBridge.commit(
          apiResponse.success({ servers, count: servers.length, category })
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // Case 5: Return all servers
      // ─────────────────────────────────────────────────────────────────────
      const servers = await getSandboxServers(supabase);

      return cookieBridge.commit(
        apiResponse.success({ servers, count: servers.length })
      );
    } catch (error) {
      logger.error("[mcp/sandbox-catalog] Error:", error);
      return cookieBridge.commit(
        apiResponse.internalError("Failed to fetch sandbox catalog")
      );
    }
  });
}
