/**
 * Database query utilities with Redis caching
 *
 * This module provides a centralized location for all Supabase queries
 * with built-in Redis caching for improved performance.
 *
 * @module server/db
 */

// Cache utilities
export {
  cachedQuery,
  CACHE_TTL,
  CACHE_NAMESPACE,
  userProfileCacheKey,
  walletDataCacheKey,
  analyticsCacheKey,
  taskCacheKey,
  sessionCacheKey,
  invalidateCache,
  invalidateCachePattern,
  type CachedQueryOptions,
} from "./cache";

// User profile queries
export {
  getUserProfile,
  updateUserProfile,
  invalidateUserProfileCache,
  type UserProfileData,
} from "./user-profile";

// Wallet data queries
export {
  getUserWalletAccounts,
  getSafeWalletAccounts,
  getRegisteredUserWallets,
  getWalletAccountByAddress,
  updateWalletAccount,
  updateUserWallet,
  invalidateWalletDataCache,
  type WalletAccountRecord,
  type UserWalletRecord,
} from "./wallet-data";

// Analytics data queries
export {
  getWalletAnalytics,
  getTokenHoldings,
  getTopTokenHoldings,
  getPortfolioSummary,
  invalidateAnalyticsCache,
  type WalletAnalyticsRecord,
  type TokenHoldingRecord,
} from "./analytics-data";
