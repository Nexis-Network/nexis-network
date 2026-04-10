function normalizeBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
}

export const featureFlags = {
  walletAssetDetailV1: normalizeBooleanFlag(
    process.env.NEXT_PUBLIC_WALLET_ASSET_DETAIL_V1,
    process.env.NODE_ENV !== "production",
  ),
} as const;
