import { formatCurrency } from "@/modules/prices/market-overview/formatters";

export function formatTimestampLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

export function formatDeltaPercent(delta: number | null): string {
  if (delta == null) {
    return "—";
  }

  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}%`;
}

export function formatAbsoluteChange(delta: number | null): string | null {
  if (delta == null) {
    return null;
  }

  return formatCurrency(delta, { currency: "USD", signDisplay: "always" });
}

export function formatChartTick(value: number, timeframe: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (timeframe === "1D" || timeframe === "5D") {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (["1M", "6M", "YTD", "1Y"].includes(timeframe)) {
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}
