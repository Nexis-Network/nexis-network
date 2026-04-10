import type { UnifiedFungibleAsset } from "@/types/wallet-unified";

export const LSD_SYMBOLS = new Set([
  "STETH", "WSTETH", "RETH", "CBETH", "SWETH", "FRXETH", "SFRXETH", "OETH", "ANKRETH", "METH",
  "MSOL", "JITOSOL", "BSOL", "STSOL", "MARINADESOL", "LSOL",
  "STKBNB", "BNBX", "ANKRBNB",
  "STMATIC", "MATICX",
  "SAVAX",
  "STATOM",
]);

const AAVE_ATOKENS = new Set([
  "AUSDC", "AUSDT", "ADAI", "AWETH", "AWBTC", "AETH", "ALINK", "AUNI",
  "ACRV", "AAVE", "ASNX", "AMKR", "ABAL", "AFRAX", "ALUSD", "AAAVE",
]);

export function isLpOrDefiToken(symbol: string | null, name: string | null): boolean {
  const normalizedSymbol = (symbol ?? "").toUpperCase();
  const normalizedName = (name ?? "").toLowerCase();

  if (AAVE_ATOKENS.has(normalizedSymbol)) return true;

  if (
    normalizedSymbol.includes("-LP") ||
    normalizedSymbol.endsWith("LP") ||
    normalizedSymbol.startsWith("UNI-V") ||
    normalizedSymbol.startsWith("SLP") ||
    normalizedSymbol.startsWith("SUSHI-") ||
    normalizedSymbol.startsWith("CRV-") ||
    normalizedSymbol.startsWith("CTOKEN")
  ) {
    return true;
  }

  return (
    normalizedName.includes("liquidity") ||
    normalizedName.includes("pool token") ||
    normalizedName.includes("lp token") ||
    normalizedName.includes("uniswap v") ||
    normalizedName.includes("sushiswap") ||
    normalizedName.includes("curve") ||
    normalizedName.includes("pancakeswap lp") ||
    normalizedName.includes("compound ")
  );
}

export type PortfolioClassification = {
  spotValue: number;
  stakingValue: number;
  defiValue: number;
  spotPct: number;
  stakingPct: number;
  defiPct: number;
};

export function classifyPortfolioAssets(
  assets: UnifiedFungibleAsset[],
): PortfolioClassification {
  let spotValue = 0;
  let stakingValue = 0;
  let defiValue = 0;

  for (const asset of assets) {
    const value = asset.valueUsd ?? 0;
    if (value <= 0) continue;

    const symbol = (asset.symbol ?? "").toUpperCase();
    if (LSD_SYMBOLS.has(symbol)) {
      stakingValue += value;
      continue;
    }

    if (isLpOrDefiToken(asset.symbol, asset.name)) {
      defiValue += value;
      continue;
    }

    spotValue += value;
  }

  const total = spotValue + stakingValue + defiValue;
  if (total === 0) {
    return {
      spotValue: 0,
      stakingValue: 0,
      defiValue: 0,
      spotPct: 100,
      stakingPct: 0,
      defiPct: 0,
    };
  }

  const rawSpot = (spotValue / total) * 100;
  const rawStaking = (stakingValue / total) * 100;
  const rawDefi = (defiValue / total) * 100;

  let spotPct = Math.floor(rawSpot);
  let stakingPct = Math.floor(rawStaking);
  let defiPct = Math.floor(rawDefi);

  const remainder = 100 - (spotPct + stakingPct + defiPct);
  const fractions = [
    { key: "spot" as const, fraction: rawSpot - spotPct },
    { key: "staking" as const, fraction: rawStaking - stakingPct },
    { key: "defi" as const, fraction: rawDefi - defiPct },
  ].sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; index < remainder; index += 1) {
    const target = fractions[index % fractions.length].key;
    if (target === "spot") spotPct += 1;
    if (target === "staking") stakingPct += 1;
    if (target === "defi") defiPct += 1;
  }

  return { spotValue, stakingValue, defiValue, spotPct, stakingPct, defiPct };
}

export function downsampleArray(values: number[], targetLength: number): number[] {
  if (values.length <= targetLength) {
    return values;
  }

  const step = values.length / targetLength;
  return Array.from({ length: targetLength }, (_, index) => {
    const targetIndex = Math.min(Math.floor(index * step), values.length - 1);
    return values[targetIndex];
  });
}
