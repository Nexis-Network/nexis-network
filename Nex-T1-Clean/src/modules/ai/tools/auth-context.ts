import { createClient } from "@/server/services/supabase/server";
import { type SupabaseClient } from "@supabase/supabase-js";

import { logger } from '@/lib/logger';
/**
 * Shared context for tool execution.
 */
export interface ToolAuthContext {
  userId: string | null;
  supabase: SupabaseClient | null;
}

/**
 * Resolves the current authenticated user and provides a Supabase server client.
 * This is used within Tool execution blocks to access user-specific data.
 * 
 * @returns Object containing userId and supabase client, or nulls if unauthenticated.
 */
export async function resolveAuthContext(): Promise<ToolAuthContext> {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { userId: null, supabase: null };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      userId: user?.id ?? null,
      supabase,
    };
  } catch (error) {
    logger.error("[AuthContext] Failed to resolve tool auth context:", error);
    return { userId: null, supabase: null };
  }
}
