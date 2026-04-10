import { formatUnits } from "viem";

const INTEGER_BALANCE_PATTERN = /^-?\d+$/;

function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/\.?0+$/, "");
}

export function normalizeBalanceToDecimal(
  balance: string | number | null | undefined,
  decimals: number,
): string {
  if (typeof balance === "number") {
    return Number.isFinite(balance) ? String(balance) : "0";
  }

  if (typeof balance !== "string") {
    return "0";
  }

  const trimmed = balance.trim();
  if (!trimmed) {
    return "0";
  }

  if (!INTEGER_BALANCE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    return trimTrailingZeros(formatUnits(BigInt(trimmed), decimals));
  } catch {
    return "0";
  }
}

export function parseBalanceToNumber(
  balance: string | number | null | undefined,
  decimals: number,
): number | null {
  const normalized = normalizeBalanceToDecimal(balance, decimals);
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDisplayBalance(
  balance: string | number | null | undefined,
  decimals: number,
  precision = 4,
): string {
  const parsed = parseBalanceToNumber(balance, decimals);
  if (parsed === null || parsed === 0) {
    return "0.0000";
  }
  if (parsed < 0.0001) {
    return "<0.0001";
  }
  return parsed.toFixed(precision);
}

export function formatBalanceInputValue(
  balance: string | number | null | undefined,
  decimals: number,
): string {
  const normalized = normalizeBalanceToDecimal(balance, decimals);
  return normalized === "" ? "0" : normalized;
}

