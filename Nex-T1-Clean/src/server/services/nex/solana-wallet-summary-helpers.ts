type SolanaPriceSnapshot = {
  usd?: number;
  usd_24h_change?: number;
} | null;

type SolanaTokenRow = Record<string, UntypedJson>;

const NATIVE_SOL_MINT = "native-sol";

export function appendNativeSolBalance(
  tokens: SolanaTokenRow[],
  nativeBalance: number | null,
  nativePrice: SolanaPriceSnapshot,
): SolanaTokenRow[] {
  if (nativeBalance === null || !Number.isFinite(nativeBalance) || nativeBalance <= 0) {
    return tokens;
  }

  const priceUsd =
    typeof nativePrice?.usd === "number" && Number.isFinite(nativePrice.usd)
      ? nativePrice.usd
      : null;
  const priceChange24h =
    typeof nativePrice?.usd_24h_change === "number" &&
    Number.isFinite(nativePrice.usd_24h_change)
      ? nativePrice.usd_24h_change
      : null;

  return [
    {
      mint: NATIVE_SOL_MINT,
      amount: nativeBalance,
      decimals: 9,
      symbol: "SOL",
      name: "Solana",
      logo: null,
      priceUsd,
      priceChange24h,
      valueUsd: priceUsd === null ? null : priceUsd * nativeBalance,
      isNative: true,
    },
    ...tokens,
  ];
}
