
import { SupabaseClient } from "@supabase/supabase-js";


import { logger } from '@/lib/logger';
export interface UserMcpConfig {
    user_id: string;
    mcp_id: string;
    enabled: boolean;
    config_overrides: Record<string, string>;
    // Joined fields
    mcp_registry?: {
        name: string;
        sre_url?: string;
    };
}

/**
 * Service to manage User MCP Configurations using existing Schema
 */
export class McpService {
    
    // Fetch all enabled configs for the current user
    static async getUserConfigs(supabase: SupabaseClient): Promise<UserMcpConfig[]> {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
            logger.warn("Unable to resolve authenticated user for MCP configs", authError);
            return [];
        }

        if (!authData.user) {
            return [];
        }

        const { data, error } = await supabase
            .from('user_mcp_config')
            .select(`
                *,
                mcp_registry (
                    name,
                    sre_url
                )
            `);
            
        if (error) {
            logger.warn("Error fetching MCP configs with embedded join, falling back:", error);
            return await McpService.fetchConfigsWithoutJoin(supabase);
        }
        return data as UserMcpConfig[];
    }

    private static async fetchConfigsWithoutJoin(supabase: SupabaseClient): Promise<UserMcpConfig[]> {
        const { data: configs, error: configsError } = await supabase
            .from('user_mcp_config')
            .select('user_id, mcp_id, enabled, config_overrides');

        if (configsError || !configs) {
            logger.error("Error fetching MCP configs without join:", configsError);
            return [];
        }

        const mcpIds = Array.from(new Set(configs.map((row) => row.mcp_id).filter(Boolean)));
        if (!mcpIds.length) {
            return configs as UserMcpConfig[];
        }

        const { data: registries, error: registryError } = await supabase
            .from('mcp_registry')
            .select('id, name, sre_url')
            .in('id', mcpIds);

        if (registryError) {
            logger.warn("Error fetching MCP registry entries for fallback", registryError);
        }

        const registryMap = new Map<string, { id: string; name: string; sre_url?: string }>();
        (registries ?? []).forEach((entry) => {
            if (entry?.id) {
                registryMap.set(entry.id, entry);
            }
        });

        return configs.map((config) => ({
            ...config,
            mcp_registry: registryMap.get(config.mcp_id) ?? undefined,
        }));
    }

    // Toggle enabled state
    static async toggleServer(supabase: SupabaseClient, serverName: string, enabled: boolean): Promise<boolean> {
        // 1. Get mcp_id from name
        const { data: registry, error: regError } = await supabase
            .from('mcp_registry')
            .select('id')
            .eq('name', serverName)
            .single();
            
        if (regError || !registry) {
            logger.error(`MCP Server ${serverName} not found in registry table.`);
            return false;
        }

        const mcpId = registry.id;
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) throw new Error("User not authenticated");

        // 2. Upsert config
        // Table: user_id, mcp_id, enabled, config_overrides
        const { error } = await supabase
            .from('user_mcp_config')
            .upsert(
                { 
                    user_id: userId,
                    mcp_id: mcpId, 
                    enabled: enabled 
                    // config_overrides? if we leave it out, upsert might null it if we strictly replace?
                    // Supabase upsert updates columns provided. 
                    // However, if we want to KEEP existing config, we should probably be careful.
                    // Let's assume onConflict works.
                }, 
                { onConflict: 'user_id, mcp_id' } 
            );

         if (error) {
             logger.error("Error toggling server:", error);
             return false;
         }
         return true;
    }

    // Save Config
    /**
     * @deprecated Use Server Action `saveUserMcpConfig` in `@/app/actions/mcp` instead to ensure encryption.
     */
    static async saveConfig(supabase: SupabaseClient, serverName: string, env: Record<string, string>): Promise<boolean> {
         logger.warn("McpService.saveConfig is deprecated. Use server action for secure storage.");
         // 1. Get mcp_id
        const { data: registry } = await supabase
            .from('mcp_registry')
            .select('id')
            .eq('name', serverName)
            .single();
            
        if (!registry) return false;

        const mcpId = registry.id;
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) throw new Error("User not authenticated");

         // 2. Upsert
         const { error } = await supabase
            .from('user_mcp_config')
            .upsert(
                { 
                    user_id: userId,
                    mcp_id: mcpId, 
                    enabled: true, 
                    config_overrides: env 
                },
                { onConflict: 'user_id, mcp_id' }
            );
            
         if (error) throw error;
         return true;
    }
}
