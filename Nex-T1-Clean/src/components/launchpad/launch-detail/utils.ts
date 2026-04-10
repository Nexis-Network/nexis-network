import { humanizeNetwork } from "@/lib/agents/format";

export function formatUsdBaseUnits(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;

  if (numeric >= 100_000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
      style: "currency",
      currency: "USD",
    }).format(numeric);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: numeric >= 100 ? 0 : 2,
  }).format(numeric);
}

export function formatNumber(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  return Number(value).toLocaleString("en-US");
}

export function formatRoundFromBps(value: number): string {
  const percentage = Math.max(0, Math.min(100, value / 100));
  return `${percentage.toFixed(1)}%`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Open";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortAge(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const deltaMs = Date.now() - date.getTime();
  const deltaMinutes = Math.floor(deltaMs / (60 * 1000));
  if (deltaMinutes < 60) return `${Math.max(1, deltaMinutes)}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

export function truncateAddress(value: string | null | undefined, size = 4): string {
  if (!value) return "Not linked";
  if (value.length <= size * 2 + 2) return value;
  return `${value.slice(0, size + 2)}…${value.slice(-size)}`;
}

export function createHeroBackground(seed: string): string {
  const hue = stringHash(seed) % 360;
  const hueSecondary = (hue + 42) % 360;
  return `radial-gradient(120% 140% at 20% 0%, hsl(${hue} 68% 26% / 0.92), transparent 52%), radial-gradient(110% 140% at 100% 0%, hsl(${hueSecondary} 70% 22% / 0.88), transparent 58%), linear-gradient(180deg, #191b1f 0%, #121316 100%)`;
}

export function chainName(networkId: string): string {
  return humanizeNetwork(networkId);
}

function stringHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}
