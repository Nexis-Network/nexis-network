/**
 * Exchange Credentials Service
 *
 * Domain: trading
 * Responsibility: Securely retrieve and manage exchange credentials from Supabase Vault
 * Depends on: Supabase Vault, types
 *
 * Security: Never logs credentials, uses server-side vault decryption
 */

import { getSupabaseServerClient } from '@/server/services/supabase/supabaseClient';
import { logger } from '@/lib/logger';
import type { ExchangeCredentials, ExchangeId, UserExchangeRecord, ExchangePermissions } from './types';
import { TradingError } from './types';

// ============================================================================
// Database Record Type
// ============================================================================

interface UserExchangeRow {
  id: string;
  user_id: string;
  exchange_id: string;
  label: string | null;
  is_active: boolean;
  is_testnet: boolean;
  permissions: ExchangePermissions | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  api_key_vault_id: string | null;
  api_secret_vault_id: string | null;
  passphrase_vault_id: string | null;
}

// Partial row for list queries
interface UserExchangeListRow {
  id: string;
  user_id: string;
  exchange_id: string;
  label: string | null;
  is_active: boolean;
  is_testnet: boolean;
  permissions: ExchangePermissions | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VAULT OPERATIONS
// ============================================================================

/**
 * Retrieve decrypted secret from Supabase Vault by ID
 * @private
 */
async function getVaultSecret(secretId: string): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    logger.error('[credentials] Supabase client not available');
    return null;
  }
  
  // Use the vault.decrypted_secrets view which auto-decrypts
  const { data, error } = await supabase
    .schema('vault')
    .from('decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', secretId)
    .single();

  if (error || !data) {
    logger.error('[credentials] Failed to retrieve vault secret', { secretId, error: error?.message });
    return null;
  }

  return (data as { decrypted_secret: string }).decrypted_secret;
}

/**
 * Store a secret in Supabase Vault
 * @private
 */
async function storeVaultSecret(
  secret: string,
  name: string,
  description?: string
): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    logger.error('[credentials] Supabase client not available');
    return null;
  }

  const { data, error } = await supabase
    .schema('vault')
    .rpc('create_secret', {
      secret,
      name,
      description: description ?? 'Exchange API credential',
    });

  if (error || !data) {
    logger.error('[credentials] Failed to store vault secret', { name, error: error?.message });
    return null;
  }

  return data as string;
}

/**
 * Delete a secret from Supabase Vault
 * @private
 */
async function deleteVaultSecret(secretId: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    logger.error('[credentials] Supabase client not available');
    return false;
  }

  const { error } = await supabase
    .schema('vault')
    .from('secrets')
    .delete()
    .eq('id', secretId);

  if (error) {
    logger.error('[credentials] Failed to delete vault secret', { secretId, error: error.message });
    return false;
  }

  return true;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get exchange credentials for a user
 * Retrieves and decrypts API keys from Supabase Vault
 */
export async function getUserExchangeCredentials(
  userId: string,
  exchangeId: ExchangeId,
  label?: string
): Promise<ExchangeCredentials | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    logger.error('[credentials] Supabase client not available');
    return null;
  }

  // Build query
  let query = supabase
    .from('user_exchanges')
    .select('*')
    .eq('user_id', userId)
    .eq('exchange_id', exchangeId)
    .eq('is_active', true);

  if (label) {
    query = query.eq('label', label);
  }

  const { data, error } = await query.limit(1).single();

  if (error || !data) {
    logger.debug('[credentials] No exchange connection found', { userId, exchangeId, label });
    return null;
  }

  const row = data as UserExchangeRow;

  // Decrypt credentials from vault
  const [apiKey, apiSecret, passphrase] = await Promise.all([
    row.api_key_vault_id ? getVaultSecret(row.api_key_vault_id) : null,
    row.api_secret_vault_id ? getVaultSecret(row.api_secret_vault_id) : null,
    row.passphrase_vault_id ? getVaultSecret(row.passphrase_vault_id) : null,
  ]);

  if (!apiKey || !apiSecret) {
    logger.error('[credentials] Failed to decrypt exchange credentials', {
      userId,
      exchangeId,
      hasApiKey: !!apiKey,
      hasSecret: !!apiSecret,
    });
    throw new TradingError(
      'INVALID_CREDENTIALS',
      'Failed to decrypt exchange credentials. Please reconnect your exchange.',
      exchangeId
    );
  }

  // Update last_used_at
  await supabase
    .from('user_exchanges')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id);

  return {
    exchangeId: row.exchange_id as ExchangeId,
    apiKey,
    secret: apiSecret,
    passphrase: passphrase ?? undefined,
    isTestnet: row.is_testnet,
  };
}

/**
 * List all exchange connections for a user (without credentials)
 */
export async function listUserExchanges(
  userId: string
): Promise<UserExchangeRecord[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    logger.error('[credentials] Supabase client not available');
    return [];
  }

  const { data, error } = await supabase
    .from('user_exchanges')
    .select('id, user_id, exchange_id, label, is_active, is_testnet, permissions, last_used_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[credentials] Failed to list user exchanges', { userId, error: error.message });
    return [];
  }

  return (data ?? []).map((row: UserExchangeListRow) => ({
    id: row.id,
    userId: row.user_id,
    exchangeId: row.exchange_id as ExchangeId,
    label: row.label ?? 'Default',
    isActive: row.is_active,
    isTestnet: row.is_testnet,
    permissions: row.permissions ?? { spot: true, futures: false, withdraw: false },
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Add a new exchange connection for a user
 */
export async function addUserExchange(
  userId: string,
  exchangeId: ExchangeId,
  apiKey: string,
  apiSecret: string,
  options?: {
    label?: string;
    passphrase?: string;
    isTestnet?: boolean;
    permissions?: { spot?: boolean; futures?: boolean; withdraw?: boolean };
  }
): Promise<UserExchangeRecord> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    throw new TradingError('EXCHANGE_ERROR', 'Supabase client not available', exchangeId);
  }
  
  const label = options?.label ?? 'Default';

  // Store credentials in vault
  const [apiKeyVaultId, apiSecretVaultId, passphraseVaultId] = await Promise.all([
    storeVaultSecret(apiKey, `${exchangeId}_api_key_${userId}`),
    storeVaultSecret(apiSecret, `${exchangeId}_api_secret_${userId}`),
    options?.passphrase
      ? storeVaultSecret(options.passphrase, `${exchangeId}_passphrase_${userId}`)
      : Promise.resolve(null),
  ]);

  if (!apiKeyVaultId || !apiSecretVaultId) {
    throw new TradingError(
      'EXCHANGE_ERROR',
      'Failed to securely store exchange credentials',
      exchangeId
    );
  }

  // Insert record
  const { data, error } = await supabase
    .from('user_exchanges')
    .insert({
      user_id: userId,
      exchange_id: exchangeId,
      label,
      is_testnet: options?.isTestnet ?? false,
      api_key_vault_id: apiKeyVaultId,
      api_secret_vault_id: apiSecretVaultId,
      passphrase_vault_id: passphraseVaultId,
      permissions: {
        spot: options?.permissions?.spot ?? true,
        futures: options?.permissions?.futures ?? false,
        withdraw: options?.permissions?.withdraw ?? false,
      },
    })
    .select()
    .single();

  if (error || !data) {
    // Cleanup vault secrets on failure
    await Promise.all([
      deleteVaultSecret(apiKeyVaultId),
      deleteVaultSecret(apiSecretVaultId),
      passphraseVaultId ? deleteVaultSecret(passphraseVaultId) : Promise.resolve(true),
    ]);

    throw new TradingError(
      'EXCHANGE_ERROR',
      error?.message ?? 'Failed to save exchange connection',
      exchangeId
    );
  }

  const row = data as UserExchangeRow;
  logger.info('[credentials] Exchange connection added', { userId, exchangeId, label });

  return {
    id: row.id,
    userId: row.user_id,
    exchangeId: row.exchange_id as ExchangeId,
    label: row.label ?? 'Default',
    isActive: row.is_active,
    isTestnet: row.is_testnet,
    permissions: row.permissions ?? { spot: true, futures: false, withdraw: false },
    lastUsedAt: row.last_used_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Remove an exchange connection and delete vault secrets
 */
export async function removeUserExchange(
  userId: string,
  exchangeConnectionId: string
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    logger.error('[credentials] Supabase client not available');
    return false;
  }

  // Get vault IDs before deletion
  const { data, error: fetchError } = await supabase
    .from('user_exchanges')
    .select('api_key_vault_id, api_secret_vault_id, passphrase_vault_id')
    .eq('id', exchangeConnectionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !data) {
    logger.error('[credentials] Exchange connection not found for deletion', {
      userId,
      exchangeConnectionId,
    });
    return false;
  }

  const row = data as Pick<UserExchangeRow, 'api_key_vault_id' | 'api_secret_vault_id' | 'passphrase_vault_id'>;

  // Delete the record (RLS ensures user can only delete their own)
  const { error: deleteError } = await supabase
    .from('user_exchanges')
    .delete()
    .eq('id', exchangeConnectionId)
    .eq('user_id', userId);

  if (deleteError) {
    logger.error('[credentials] Failed to delete exchange connection', {
      exchangeConnectionId,
      error: deleteError.message,
    });
    return false;
  }

  // Cleanup vault secrets (best effort)
  await Promise.all([
    row.api_key_vault_id ? deleteVaultSecret(row.api_key_vault_id) : Promise.resolve(true),
    row.api_secret_vault_id ? deleteVaultSecret(row.api_secret_vault_id) : Promise.resolve(true),
    row.passphrase_vault_id ? deleteVaultSecret(row.passphrase_vault_id) : Promise.resolve(true),
  ]);

  logger.info('[credentials] Exchange connection removed', { userId, exchangeConnectionId });
  return true;
}

/**
 * Toggle exchange connection active status
 */
export async function toggleUserExchange(
  userId: string,
  exchangeConnectionId: string,
  isActive: boolean
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    logger.error('[credentials] Supabase client not available');
    return false;
  }

  const { error } = await supabase
    .from('user_exchanges')
    .update({ is_active: isActive })
    .eq('id', exchangeConnectionId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[credentials] Failed to toggle exchange connection', {
      exchangeConnectionId,
      isActive,
      error: error.message,
    });
    return false;
  }

  return true;
}
