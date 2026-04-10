/**
 * Nex Admin Wallet Utilities
 * 
 * Provides server-side access to the admin smart account for:
 * - Executing trade instructions
 * - Processing payment orchestrations
 * - System-level operations
 */

import { privateKeyToAccount } from "viem/accounts";
import { createNexSmartAccount, type NexSmartAccountResult } from "./safe-account";
import { getAdminPrivateKey } from "./env";
import { DEFAULT_CHAIN_ID } from "./chains";


import { logger } from '@/lib/logger';
/**
 * Get the admin smart account
 * 
 * Uses the configured admin private key to derive a Nex/Safe smart account.
 * This is a deterministic operation (same key + same salt = same address).
 * 
 * @param chainId - Chain ID to connect to (defaults to Base/8453)
 */
export async function getNexAdminAccount(
  chainId: number = DEFAULT_CHAIN_ID
): Promise<NexSmartAccountResult | null> {
  const privateKey = getAdminPrivateKey();
  
  if (!privateKey) {
    logger.warn("[Nex] Admin private key not configured. Admin operations disabled.");
    return null;
  }

  try {
    const owner = privateKeyToAccount(privateKey as `0x${string}`);
    
    // We use a fixed salt for the admin account to ensure address stability
    // even if implementation details change slightly
    const ADMIN_SALT = 0n;

    return await createNexSmartAccount({
      owner,
      chainId,
      salt: ADMIN_SALT,
    });
  } catch (error) {
    logger.error("[Nex] Failed to initialize admin account:", error);
    return null;
  }
}
