'use server';

import { createClient } from '@/server/services/supabase/server';
import { encrypt } from '@/lib/server/encryption';


import { logger } from '@/lib/logger';
interface SaveConfigResult {
  success: boolean;
  error?: string;
}

export async function saveUserMcpConfig(
  serverName: string,
  env: Record<string, string>
): Promise<SaveConfigResult> {
  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: 'Supabase client not available' };
  }

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  // 2. Get MCP ID
  const { data: registry, error: regError } = await supabase
    .from('mcp_registry')
    .select('id')
    .eq('name', serverName)
    .single();

  if (regError || !registry) {
    return { success: false, error: `MCP Server '${serverName}' not found` };
  }

  // 3. Encrypt payload
  // We store the entire env object as an encrypted blob within a special wrapper
  // This allows us to distinguish between legacy/plain configs and encrypted ones.
  const payloadStr = JSON.stringify(env);
  const encryptedPayload = encrypt(payloadStr);

  const configData = {
    encrypted: encryptedPayload
  };

  // 4. Upsert config
  const { error: upsertError } = await supabase
    .from('user_mcp_config')
    .upsert(
      {
        user_id: user.id,
        mcp_id: registry.id,
        enabled: true,
        // The column name in the table is `config_overrides` based on migration `20251229000000_mcp_registry.sql`
        // But in `20260106000000_user_mcp_configs.sql` it was `env_vars`?
        // Wait, I need to check which table/column is actually being used. 
        // usage in mcp-service.ts uses `config_overrides`.
        // The migration `20260106` created `user_mcp_configs` (plural) with `env_vars`.
        // The migration `20251229` created `user_mcp_config` (singular) with `config_overrides`.
        // The service `mcp-service.ts` uses `user_mcp_config` (sinuglar).
        // I should stick to `user_mcp_config` (singular) and `config_overrides`.
        config_overrides: configData
      },
      { onConflict: 'user_id, mcp_id' }
    );

  if (upsertError) {
    logger.error('Error saving MCP config:', upsertError);
    return { success: false, error: 'Failed to save configuration' };
  }

  return { success: true };
}
