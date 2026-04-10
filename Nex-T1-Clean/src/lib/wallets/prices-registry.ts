export const ASSET_DETAIL_TTL_MS = 5 * 60 * 1000;
export const ASSET_LIVE_TTL_MS = 30 * 1000;

export const ASSET_DETAIL_SWR_CONFIG = {
  refreshInterval: ASSET_DETAIL_TTL_MS,
  dedupingInterval: ASSET_DETAIL_TTL_MS,
  revalidateOnFocus: false,
  revalidateIfStale: true,
} as const;

export const ASSET_LIVE_SWR_CONFIG = {
  refreshInterval: ASSET_LIVE_TTL_MS,
  dedupingInterval: ASSET_LIVE_TTL_MS,
  revalidateOnFocus: false,
  revalidateIfStale: true,
} as const;
