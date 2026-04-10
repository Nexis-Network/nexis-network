const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatFiat(value: number | null | undefined, { compact = false }: { compact?: boolean } = {}): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return compact ? "$0" : "$0.00";
  }
  return (compact ? compactCurrencyFormatter : currencyFormatter).format(value);
}

export function formatBalance(value: number | null | undefined, decimals = 4): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }
  if (Math.abs(value) >= 1) {
    return value.toFixed(Math.min(decimals, 2));
  }
  return value.toFixed(decimals);
}

export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  return percentFormatter.format(value / 100);
}
