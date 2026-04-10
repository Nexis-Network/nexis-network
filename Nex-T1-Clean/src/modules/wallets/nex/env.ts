import { logger } from '@/lib/logger';

/**
 * Nex Wallet Environment Configuration
 * Pimlico bundler configuration for ERC-4337 Account Abstraction
 */


function normalizeEnvValue(value: string | undefined | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/^['"]+|['"]+$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

// Pimlico API Key - required for bundler operations
const PIMLICO_API_KEY =
  normalizeEnvValue(process.env.PIMLICO_API_KEY) ??
  normalizeEnvValue(process.env.NEXT_PUBLIC_PIMLICO_API_KEY);

// EntryPoint version configuration
const ENTRY_POINT_VERSION =
  normalizeEnvValue(process.env.NEX_ENTRY_POINT_VERSION) ?? "0.7";



// Feature flags
const RAW_ENABLE_NEX_AA =
  normalizeEnvValue(process.env.NEXT_PUBLIC_ENABLE_NEX_AA) ??
  normalizeEnvValue(process.env.ENABLE_NEX_AA);

function resolveEnableFlag(): boolean {
  if (typeof RAW_ENABLE_NEX_AA === "string") {
    const normalized = RAW_ENABLE_NEX_AA.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  // Default to enabled if Pimlico API key is configured
  return Boolean(PIMLICO_API_KEY);
}

const ENABLE_NEX_AA = resolveEnableFlag();

/**
 * Check if Nex AA (Account Abstraction) is enabled
 */
export function isNexAAEnabled(): boolean {
  return ENABLE_NEX_AA && Boolean(PIMLICO_API_KEY);
}

/**
 * Get Pimlico API key - throws if not configured
 */
export function ensurePimlicoApiKey(): string {
  if (!PIMLICO_API_KEY) {
    throw new Error(
      "Pimlico API key is not configured. Set PIMLICO_API_KEY or NEXT_PUBLIC_PIMLICO_API_KEY."
    );
  }
  return PIMLICO_API_KEY;
}

/**
 * Get Pimlico API key - returns null if not configured
 */
export function getPimlicoApiKey(): string | null {
  return PIMLICO_API_KEY;
}

/**
 * Get the EntryPoint version to use (0.6 or 0.7)
 */
export function getEntryPointVersion(): "0.6" | "0.7" {
  if (ENTRY_POINT_VERSION === "0.6") return "0.6";
  return "0.7";
}



/**
 * Build Pimlico bundler RPC URL for a given chain
 */
export function getPimlicoBundlerUrl(chainId: number): string {
  const apiKey = ensurePimlicoApiKey();
  return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${apiKey}`;
}

/**
 * Assert that the Nex AA environment is properly configured
 */
export function assertNexAAEnv(): void {
  if (!isNexAAEnabled()) {
    return;
  }

  const missing: string[] = [];

  if (!PIMLICO_API_KEY) {
    missing.push("PIMLICO_API_KEY");
  }

  if (missing.length > 0) {
    const message = `Nex AA misconfigured. Missing required env vars: ${missing.join(
      ", "
    )}. Smart account operations cannot continue.`;
    logger.error(message);
    throw new Error(message);
  }
}

export { normalizeEnvValue };

// Admin Private Key (for server-side operations)
const ADMIN_PRIVATE_KEY = normalizeEnvValue(process.env.NEX_ADMIN_PRIVATE_KEY);

/**
 * Get the admin private key - returns null if not configured
 */
export function getAdminPrivateKey(): string | null {
  return ADMIN_PRIVATE_KEY;
}

/**
 * Get the admin private key - throws if not configured
 */
export function ensureAdminPrivateKey(): string {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error(
      "Admin private key is not configured. Set NEX_ADMIN_PRIVATE_KEY."
    );
  }
  return ADMIN_PRIVATE_KEY;
}
