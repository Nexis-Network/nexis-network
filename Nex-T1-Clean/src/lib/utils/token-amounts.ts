import { formatUnits, parseUnits } from "viem";

const MAX_TOKEN_DECIMALS = 255;

function isValidTokenDecimals(decimals: number): boolean {
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= MAX_TOKEN_DECIMALS;
}

export function tryParseTokenAmountToBaseUnits(amount: string, decimals: number): bigint | null {
  if (!isValidTokenDecimals(decimals)) {
    return null;
  }

  const normalized = amount.trim();
  if (!normalized) {
    return null;
  }
  const signNormalized = normalized.startsWith("-") ? normalized.slice(1) : normalized;
  const [_, fraction = ""] = signNormalized.split(".");
  if (fraction.length > decimals) {
    return null;
  }

  try {
    const parsed = parseUnits(normalized, decimals);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function formatTokenAmountFromBaseUnits(
  amount: string | bigint,
  decimals: number,
  precision = 6,
): string {
  if (!isValidTokenDecimals(decimals)) {
    return "0";
  }

  let normalized: string;
  try {
    normalized = formatUnits(typeof amount === "bigint" ? amount : BigInt(amount), decimals);
  } catch {
    return "0";
  }

  if (precision < 0) {
    return normalized;
  }

  const [whole, fraction = ""] = normalized.split(".");
  const clampedFraction = fraction.slice(0, precision).replace(/0+$/u, "");

  return clampedFraction.length > 0 ? `${whole}.${clampedFraction}` : whole;
}
