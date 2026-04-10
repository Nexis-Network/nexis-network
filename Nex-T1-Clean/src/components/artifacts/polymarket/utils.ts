/**
 * Shared utilities for Polymarket artifact components.
 *
 * All Polymarket API values come as strings. These helpers safely parse
 * and format them for display, handling NaN and edge cases.
 */

/**
 * Safely parse a string value to number. Returns 0 for NaN/null/undefined.
 */
export function safeNum(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format a volume/liquidity value in compact notation (e.g., "$1.2M").
 */
export function formatCompactUsd(value: string | number): string {
  const n = safeNum(value);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

/**
 * Format a full USD amount with 2 decimal places.
 */
export function formatUsd(value: string | number): string {
  const n = safeNum(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Format a price (0-1 range) as cents with 1 decimal.
 */
export function formatCents(value: string | number): string {
  const n = safeNum(value);
  return `${(n * 100).toFixed(1)}c`;
}

/**
 * Format a size/quantity in compact notation.
 */
export function formatSize(value: string | number): string {
  const n = safeNum(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/**
 * Format a percentage with sign.
 */
export function formatPct(value: string | number): string {
  const n = safeNum(value);
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Format an ISO date string as a short date.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Truncate a hash/address for display.
 */
export function truncateHash(hash: string, startLen = 10, endLen = 6): string {
  if (!hash || hash.length <= startLen + endLen + 3) return hash || "";
  return `${hash.slice(0, startLen)}...${hash.slice(-endLen)}`;
}
