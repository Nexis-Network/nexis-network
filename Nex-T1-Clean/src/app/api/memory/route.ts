/**
 * API Route: Memory Management
 * GET /api/memory - List all user memories
 * DELETE /api/memory - Delete all user memories
 */

import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { createClient } from "@/server/services/supabase/server";
import { getAllUserMemories, deleteAllUserMemories, deleteMemory } from "@/lib/memory/mem0-client";
import { requireInternalProtection } from "@/lib/security/csrf";


import { logger } from '@/lib/logger';
export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.internalError("Supabase client not configured");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const memories = await getAllUserMemories(user.id);

    return apiResponse.success({ memories });
  } catch (error) {
    logger.error("[API] Get memories error:", error);
    return apiResponse.internalError(
      error instanceof Error ? error.message : "Failed to get memories"
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = requireInternalProtection(req);
    if (guard) return guard;

    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.internalError("Supabase client not configured");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const url = new URL(req.url);
    const memoryId = url.searchParams.get("id");

    if (memoryId) {
      // Delete specific memory
      const success = await deleteMemory(memoryId);
      return apiResponse.success({ success });
    } else {
      // Delete all memories
      const success = await deleteAllUserMemories(user.id);
      return apiResponse.success({ success });
    }
  } catch (error) {
    logger.error("[API] Delete memory error:", error);
    return apiResponse.internalError(
      error instanceof Error ? error.message : "Failed to delete memory"
    );
  }
}

