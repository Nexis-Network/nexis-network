import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'


import { logger } from '@/lib/logger';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string, prefix = 6, suffix = 4) {
  if (typeof address !== "string") {
    return "";
  }
  const trimmed = address.trim();
  if (trimmed.length <= prefix + suffix + 2) {
    return trimmed;
  }
  const start = trimmed.slice(0, prefix + 2);
  const end = trimmed.slice(-suffix);
  return `${start}…${end}`;
}

// Alias for compatibility
export const shortenAddress = truncateAddress;

export function formatSmartWalletLabel(address: string, visible = 7) {
  if (typeof address !== "string" || address.length < 2) {
    return address;
  }
  const normalized = address.trim();
  if (!normalized.startsWith("0x")) {
    return truncateAddress(normalized, visible, 0);
  }
  const sliceLength = Math.max(visible, 1);
  const prefix = normalized.slice(0, Math.min(2 + sliceLength, normalized.length));
  return prefix;
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "$0.00";
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function formatBigInt(value: string | bigint, decimals: number = 18, displayDecimals: number = 4): string {
    if (value === undefined || value === null || value === "") return "0";
    try {
        const val = typeof value === 'string' ? BigInt(value) : value;
        const divisor = BigInt(10 ** decimals);
        const integerPart = val / divisor;
        // We can use Number for the fractional part approximation for display
        const remainder = val % divisor;
        const remainderStr = remainder.toString().padStart(decimals, '0');
        const fraction = remainderStr.slice(0, displayDecimals).replace(/0+$/, '');
        
        return fraction ? `${integerPart}.${fraction}` : integerPart.toString();
    } catch (e) {
        logger.warn("formatBigInt error:", e);
        return "0";
    }
}

function isHttpLikeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isLikelyDataUrl(value: string) {
  if (!value.startsWith("data:image/")) return false;
  const commaIndex = value.indexOf(",");
  if (commaIndex <= 0) return false;
  const meta = value.slice(0, commaIndex);
  if (!meta.includes(";base64")) return false;
  const payload = value.slice(commaIndex + 1).trim();
  if (payload.length === 0) return false;
  // Basic base64 guard: allow padding +/=
  return /^[A-Za-z0-9+/=\r\n]+$/.test(payload);
}

export function sanitizeImageSrc(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  
  // Handle IPFS
  if (value.startsWith("ipfs://")) {
    return value.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  
  if (isHttpLikeUrl(value)) return value;
  if (isLikelyDataUrl(value)) return value;
  return null;
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(2) + "M";
  }
  if (num >= 1_000) {
      return (num / 1_000).toFixed(2) + "K";
  }
  return num.toLocaleString();
}

type HistoryRecord = Record<string, unknown>;

export function formatJSONString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function getDisplayTextFromHistory(item: HistoryRecord): string {
  const candidates = [
    item.prompt,
    item.input,
    item.query,
    item.message,
    item.text,
    item.title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const firstStringValue = Object.values(item).find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  if (firstStringValue) {
    return firstStringValue.trim();
  }

  return formatJSONString(item);
}

export function formatDisplayText(text: string, maxLength = 80): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}
