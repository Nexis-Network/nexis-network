/**
 * CDP Identity Resolution Service
 *
 * Server-only module for resolving blockchain addresses to human-readable
 * names via ENS (Ethereum Name Service) and Basename (Base L2).
 *
 * Resolution order:
 * 1. Check Redis cache first
 * 2. Try Nex ENS claims (`*.nex-t1.eth`)
 * 3. Try Basename resolution (Base L2 ENS registry)
 * 4. Fall back to ENS (Ethereum mainnet)
 *
 * Results are cached in Redis with a 5-minute TTL.
 */
import "server-only";

import { createPublicClient, http } from "viem";
import { base, mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { lookupEnsSubnameByAddress } from "@/server/services/ens/subnames";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResolvedIdentity = {
  address: string;
  name: string | null;
  avatar: string | null;
  source: "ens" | "basename" | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cache TTL for identity resolution (5 minutes) */
const IDENTITY_CACHE_TTL_SECONDS = 300;

/** Cache key prefix for forward lookups (address -> name) */
const IDENTITY_CACHE_PREFIX = "identity:";

/** Cache key prefix for reverse lookups (name -> address) */
const REVERSE_CACHE_PREFIX = "identity_reverse:";

/** Base L2 RPC endpoint (fallback) */
const BASE_RPC_FALLBACK = "https://mainnet.base.org";

/** Ethereum mainnet RPC endpoint (fallback) */
const ETH_RPC_FALLBACK = "https://eth.llamarpc.com";

// ---------------------------------------------------------------------------
// Viem Clients (lazy singletons — deferred so env vars are read at call time)
//
// Each chain has its own precise return type (Base L2 includes deposit tx
// types that mainnet doesn't), so we use per-chain factory functions and
// let TypeScript infer the exact types via `ReturnType<typeof factory>`.
// ---------------------------------------------------------------------------

let _baseClient: ReturnType<typeof createBaseClient> | null = null;
let _ethClient: ReturnType<typeof createEthClient> | null = null;

function createBaseClient() {
  const url = process.env.BASE_RPC_URL || BASE_RPC_FALLBACK;
  return createPublicClient({ chain: base, transport: http(url) });
}

function createEthClient() {
  const url = process.env.ETHEREUM_RPC_URL || ETH_RPC_FALLBACK;
  return createPublicClient({ chain: mainnet, transport: http(url) });
}

function getBaseClient() {
  return (_baseClient ??= createBaseClient());
}

function getEthClient() {
  return (_ethClient ??= createEthClient());
}

// ---------------------------------------------------------------------------
// Cache Helpers
// ---------------------------------------------------------------------------

async function getCachedIdentity(cacheKey: string): Promise<ResolvedIdentity | null> {
  if (!isRedisConfigured) return null;

  try {
    const cached = await redis.get<ResolvedIdentity>(cacheKey);
    return cached;
  } catch (err) {
    logger.warn("identity_cache_read_failed", {
      key: cacheKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function setCachedIdentity(cacheKey: string, data: ResolvedIdentity): Promise<void> {
  if (!isRedisConfigured) return;

  try {
    await redis.set(cacheKey, data as unknown as UntypedJson, { ex: IDENTITY_CACHE_TTL_SECONDS });
  } catch (err) {
    logger.warn("identity_cache_write_failed", {
      key: cacheKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function getCachedAddress(cacheKey: string): Promise<string | null> {
  if (!isRedisConfigured) return null;

  try {
    return await redis.get<string>(cacheKey);
  } catch {
    return null;
  }
}

async function setCachedAddress(cacheKey: string, address: string): Promise<void> {
  if (!isRedisConfigured) return;

  try {
    await redis.set(cacheKey, address, { ex: IDENTITY_CACHE_TTL_SECONDS });
  } catch {
    // Swallow cache write errors silently
  }
}

// ---------------------------------------------------------------------------
// Basename Resolution (Base L2)
// ---------------------------------------------------------------------------

async function resolveBasename(address: string): Promise<{ name: string; avatar: string | null } | null> {
  try {
    const name = await getBaseClient().getEnsName({
      address: address as `0x${string}`,
      universalResolverAddress: "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD",
    });

    if (!name) return null;

    let avatar: string | null = null;
    try {
      avatar = await getBaseClient().getEnsAvatar({
        name: normalize(name),
        universalResolverAddress: "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD",
      });
    } catch {
      // Avatar resolution is best-effort
    }

    return { name, avatar };
  } catch (err) {
    logger.debug("basename_resolution_failed", {
      address,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function resolveBasenameAddress(name: string): Promise<string | null> {
  try {
    const normalized = normalize(name);
    const address = await getBaseClient().getEnsAddress({
      name: normalized,
      universalResolverAddress: "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD",
    });
    return address ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ENS Resolution (Ethereum mainnet)
// ---------------------------------------------------------------------------

async function resolveEns(address: string): Promise<{ name: string; avatar: string | null } | null> {
  try {
    const name = await getEthClient().getEnsName({
      address: address as `0x${string}`,
    });

    if (!name) return null;

    let avatar: string | null = null;
    try {
      avatar = await getEthClient().getEnsAvatar({
        name: normalize(name),
      });
    } catch {
      // Avatar resolution is best-effort
    }

    return { name, avatar };
  } catch (err) {
    logger.debug("ens_resolution_failed", {
      address,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function resolveEnsAddress(name: string): Promise<string | null> {
  try {
    const normalized = normalize(name);
    const address = await getEthClient().getEnsAddress({ name: normalized });
    return address ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve an Ethereum address to a human-readable name.
 *
 * Resolution order:
 * 1. Redis cache
 * 2. Nex ENS claims (`*.nex-t1.eth`)
 * 3. Basename (Base L2 ENS registry)
 * 4. ENS (Ethereum mainnet)
 *
 * @param address - The EVM address to resolve (0x-prefixed, checksummed or not)
 * @returns Resolved identity with name, avatar, and source
 */
export async function resolveIdentity(address: string): Promise<ResolvedIdentity> {
  const normalizedAddress = address.toLowerCase();
  const cacheKey = `${IDENTITY_CACHE_PREFIX}${normalizedAddress}`;

  // 1. Check cache
  const cached = await getCachedIdentity(cacheKey);
  if (cached) {
    logger.debug("identity_cache_hit", { address: normalizedAddress });
    return cached;
  }

  logger.debug("identity_resolution_started", { address: normalizedAddress });

  // 2. Prefer app-issued ENS claims first
  const nexEnsName = await lookupEnsSubnameByAddress(normalizedAddress);
  if (nexEnsName) {
    const result: ResolvedIdentity = {
      address,
      name: nexEnsName,
      avatar: null,
      source: "ens",
    };
    await setCachedIdentity(cacheKey, result);
    logger.debug("identity_resolved_nex_ens", { address, name: nexEnsName });
    return result;
  }

  // 3. Try Basename (Base L2)
  const basenameResult = await resolveBasename(address);
  if (basenameResult) {
    const result: ResolvedIdentity = {
      address,
      name: basenameResult.name,
      avatar: basenameResult.avatar,
      source: "basename",
    };
    await setCachedIdentity(cacheKey, result);
    logger.debug("identity_resolved_basename", { address, name: basenameResult.name });
    return result;
  }

  // 4. Fall back to ENS (Ethereum mainnet)
  const ensResult = await resolveEns(address);
  if (ensResult) {
    const result: ResolvedIdentity = {
      address,
      name: ensResult.name,
      avatar: ensResult.avatar,
      source: "ens",
    };
    await setCachedIdentity(cacheKey, result);
    logger.debug("identity_resolved_ens", { address, name: ensResult.name });
    return result;
  }

  // 5. No resolution found
  const result: ResolvedIdentity = {
    address,
    name: null,
    avatar: null,
    source: null,
  };
  await setCachedIdentity(cacheKey, result);
  logger.debug("identity_unresolved", { address });
  return result;
}

/**
 * Resolve a human-readable name (ENS or Basename) to an Ethereum address.
 *
 * Resolution order:
 * 1. Redis cache
 * 2. If name ends with `.base` or `.base.eth`, try Basename first
 * 3. Try ENS (Ethereum mainnet)
 * 4. Try Basename as fallback
 *
 * @param name - The ENS or Basename to resolve (e.g., "vitalik.eth", "alice.base")
 * @returns The resolved address, or null if not found
 */
export async function resolveAddress(name: string): Promise<string | null> {
  const normalizedName = name.toLowerCase().trim();
  const cacheKey = `${REVERSE_CACHE_PREFIX}${normalizedName}`;

  // 1. Check cache
  const cachedAddress = await getCachedAddress(cacheKey);
  if (cachedAddress) {
    return cachedAddress;
  }

  const isBasename = normalizedName.endsWith(".base") || normalizedName.endsWith(".base.eth");

  // 2. Try Basename first if it looks like a Basename
  if (isBasename) {
    const basenameAddr = await resolveBasenameAddress(normalizedName);
    if (basenameAddr) {
      await setCachedAddress(cacheKey, basenameAddr);
      return basenameAddr;
    }
  }

  // 3. Try ENS
  const ensAddr = await resolveEnsAddress(normalizedName);
  if (ensAddr) {
    await setCachedAddress(cacheKey, ensAddr);
    return ensAddr;
  }

  // 4. Try Basename as fallback (if not already tried)
  if (!isBasename) {
    const basenameAddr = await resolveBasenameAddress(normalizedName);
    if (basenameAddr) {
      await setCachedAddress(cacheKey, basenameAddr);
      return basenameAddr;
    }
  }

  return null;
}
