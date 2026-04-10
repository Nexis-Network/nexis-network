import {
  matchesSupabaseError,
  toSupabaseLogContext,
} from "@/lib/errors/supabase";
import { isUuidString } from "@/lib/utils/uuid";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { redis } from "@/server/services/redis";
import { getSandboxTtlSeconds } from "@/server/services/e2b/sandbox-session";


import { logger } from '@/lib/logger';
let hasWarnedAboutMissingConversationSandboxColumn = false;

const conversationSandboxCacheKey = (conversationId: string) =>
    `conversation:${conversationId}:sandbox`;

function isMissingConversationSandboxColumn(error: unknown): boolean {
    return matchesSupabaseError(error, {
        codes: ["42703", "PGRST204"],
        messagePatterns: [
            /column .*sandbox_id.* does not exist/i,
            /Could not find the 'sandbox_id' column/i,
        ],
    });
}

function warnMissingConversationSandboxColumn(error: unknown) {
    if (hasWarnedAboutMissingConversationSandboxColumn) {
        return;
    }

    hasWarnedAboutMissingConversationSandboxColumn = true;
    logger.warn("conversation_sandbox_column_missing", {
        error: toSupabaseLogContext(error),
    });
}

async function getCachedConversationSandboxId(
    conversationId: string,
): Promise<string | null> {
    const cached = await redis.get<string>(conversationSandboxCacheKey(conversationId));
    return typeof cached === "string" && cached.trim().length > 0 ? cached : null;
}

async function cacheConversationSandboxId(
    conversationId: string,
    sandboxId: string,
): Promise<void> {
    await redis.set(conversationSandboxCacheKey(conversationId), sandboxId, {
        ex: getSandboxTtlSeconds(),
    });
}

function getServiceSupabase() {
    try {
        return createServiceRoleClient();
    } catch (error) {
        logger.warn("Missing Supabase credentials for sandbox service", {
            error: toSupabaseLogContext(error),
        });
        return null;
    }
}

/**
 * Fetch the sandbox ID associated with a conversation
 */
export async function getConversationSandboxId(conversationId: string): Promise<string | null> {
    if (!isUuidString(conversationId)) {
        return null;
    }

    const cachedSandboxId = await getCachedConversationSandboxId(conversationId);
    if (cachedSandboxId) {
        return cachedSandboxId;
    }

    if (hasWarnedAboutMissingConversationSandboxColumn) {
        return null;
    }

    const supabase = getServiceSupabase();
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from("conversations")
            .select("sandbox_id")
            .eq("id", conversationId)
            .single();

        if (error) {
            // Ignore "PGRST116" (JSON object requested, multiple (or no) rows returned) if no rows found
            if (error.code !== "PGRST116") {
                if (isMissingConversationSandboxColumn(error)) {
                    warnMissingConversationSandboxColumn(error);
                } else {
                    logger.error("Failed to fetch sandbox ID", {
                        conversationId,
                        error: toSupabaseLogContext(error),
                    });
                }
            }
            return null;
        }

        const sandboxId = data?.sandbox_id ?? null;
        if (typeof sandboxId === "string" && sandboxId.length > 0) {
            await cacheConversationSandboxId(conversationId, sandboxId);
        }

        return sandboxId;
    } catch (error) {
        logger.error("Error fetching sandbox ID", {
            conversationId,
            error: toSupabaseLogContext(error),
        });
        return null;
    }
}

/**
 * Save the sandbox ID to a conversation
 */
export async function setConversationSandboxId(conversationId: string, sandboxId: string): Promise<boolean> {
    if (!isUuidString(conversationId)) {
        return false;
    }

    const supabase = getServiceSupabase();
    if (!supabase) return false;

    try {
        const { error } = await supabase
            .from("conversations")
            .update({ sandbox_id: sandboxId })
            .eq("id", conversationId);

        if (error) {
            if (isMissingConversationSandboxColumn(error)) {
                warnMissingConversationSandboxColumn(error);
                await cacheConversationSandboxId(conversationId, sandboxId);
                return true;
            } else {
                logger.error("Failed to save sandbox ID", {
                    conversationId,
                    sandboxId,
                    error: toSupabaseLogContext(error),
                });
            }
            return false;
        }

        await cacheConversationSandboxId(conversationId, sandboxId);
        return true;
    } catch (error) {
        logger.error("Error saving sandbox ID", {
            conversationId,
            sandboxId,
            error: toSupabaseLogContext(error),
        });
        return false;
    }
}
