import { AgentListItem } from "@/lib/agents/types";
import { resolveAvatarImageSrc } from "@/lib/avatar-image-fallback";

// Helper to extract Orb colors
// Helper to extract Orb colors
export function getOrbColors(url?: string | null): [string, string] | undefined {
  if (url?.startsWith("orb:")) {
    const parts = url.replace("orb:", "").split(",");
    if (parts.length >= 2) return [parts[0], parts[1]] as [string, string];
  }
  return undefined;
}

function truncateText(value: string | null | undefined, max = 60): string {
  if (!value) return "No description provided.";
  return value.length > max ? `${value.substring(0, max)}...` : value;
}

function formatBaseUnits(value: string, decimals: number): string {
  if (!/^\d+$/.test(value)) return "0";
  if (!Number.isInteger(decimals) || decimals < 0) return value;
  const safeDecimals = Math.min(decimals, 18);
  const raw = BigInt(value);
  const base = 10n ** BigInt(safeDecimals);
  const whole = raw / base;
  const fraction = raw % base;
  if (fraction === 0n) return whole.toString();
  const paddedFraction = fraction.toString().padStart(safeDecimals, "0").slice(0, 4).replace(/0+$/, "");
  return paddedFraction.length > 0 ? `${whole.toString()}.${paddedFraction}` : whole.toString();
}

export function mapAgentToTrendingToken(agent: AgentListItem) {
  const perf = agent.performance;
  const isPositive = (perf?.realizedPnlUsd ?? 0) >= 0;
  
  return {
    id: agent.id,
    name: agent.name,
    value: perf?.realizedPnlUsd ? `$${(Math.abs(perf.realizedPnlUsd) / 1000).toFixed(1)}K` : "$0.0",
    valueLabel: "24h PnL",
    change: perf?.averageReturnPercent ? `${perf.averageReturnPercent.toFixed(1)}%` : "0.0%",
    isPositive,
    imageUrl: agent.avatarUrl || undefined,
    href: `/agents/${agent.id}`,
  };
}

export function mapAgentToCollection(agent: AgentListItem) {
  const price = agent.listingSummary?.[0];
  const displayPrice = price
    ? `${formatBaseUnits(price.priceBaseUnits, price.currencyDecimals)} ${price.currencySymbol || "ETH"}`
    : "Free";
  
  return {
    title: agent.name,
    subtitle: truncateText(agent.description),
    value: displayPrice,
    valueLabel: agent.listingSummary?.[0]?.listingType === "usage" ? "Per Use" : "Price",
    image: resolveAvatarImageSrc(agent.avatarUrl, agent.slug),
    orbColors: getOrbColors(agent.avatarUrl),
    change: agent.performance?.winRatePercent ? `${agent.performance.winRatePercent.toFixed(0)}%` : undefined,
    isPositive: true,
    href: `/agents/${agent.id}`,
  };
}

export function mapAgentToMover(agent: AgentListItem) {
  const perf = agent.performance;
  
  return {
    title: agent.name,
    value: perf?.winRatePercent ? `${perf.winRatePercent.toFixed(1)}%` : "0%",
    valueLabel: "Win Rate",
    image: resolveAvatarImageSrc(agent.avatarUrl, agent.slug),
    orbColors: getOrbColors(agent.avatarUrl),
    change: perf?.averageReturnPercent ? `${perf.averageReturnPercent.toFixed(1)}%` : undefined,
    isPositive: (perf?.averageReturnPercent ?? 0) >= 0,
    href: `/agents/${agent.id}`,
  };
}
