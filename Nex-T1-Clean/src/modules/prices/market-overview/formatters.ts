const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

type SignDisplayOption = Intl.NumberFormatOptions["signDisplay"] extends string
  ? Intl.NumberFormatOptions["signDisplay"]
  : "auto";

type CurrencyFormatterCacheKey = `${string}-${number}-${"compact" | "standard"}-${SignDisplayOption}`;

const currencyFormatterCache = new Map<CurrencyFormatterCacheKey, Intl.NumberFormat>();

function getCurrencyFormatter(
  currency: string,
  maximumFractionDigits: number,
  compact: boolean,
  signDisplay?: Intl.NumberFormatOptions["signDisplay"],
) {
  const normalizedCurrency = currency.toUpperCase();
  const normalizedSignDisplay: SignDisplayOption = (signDisplay ?? "auto") as SignDisplayOption;
  const key: CurrencyFormatterCacheKey = `${normalizedCurrency}-${maximumFractionDigits}-${compact ? "compact" : "standard"}-${normalizedSignDisplay}`;
  if (!currencyFormatterCache.has(key)) {
    currencyFormatterCache.set(
      key,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: normalizedCurrency,
        maximumFractionDigits,
        notation: compact ? "compact" : "standard",
        signDisplay: normalizedSignDisplay,
      }),
    );
  }
  return currencyFormatterCache.get(key)!;
}

const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(
  value: number | null | undefined,
  {
    compact = false,
    maximumFractionDigits = 2,
    currency = "USD",
    signDisplay,
  }: {
    compact?: boolean;
    maximumFractionDigits?: number;
    currency?: string;
    signDisplay?: Intl.NumberFormatOptions["signDisplay"];
  } = {},
) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  const fractionDigits = value < 1 && !compact ? Math.max(4, maximumFractionDigits) : maximumFractionDigits;

  if (compact) {
    return getCurrencyFormatter(currency, fractionDigits, true, signDisplay).format(value);
  }

  return getCurrencyFormatter(currency, fractionDigits, false, signDisplay).format(value);
}

export function formatNumber(
  value: number | null | undefined,
  {
    compact = false,
    maximumFractionDigits = 2,
    minimumFractionDigits,
  }: { compact?: boolean; maximumFractionDigits?: number; minimumFractionDigits?: number } = {},
) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  const normalizedMinDigits =
    minimumFractionDigits != null && Number.isFinite(minimumFractionDigits)
      ? Math.max(0, Number(minimumFractionDigits))
      : undefined;

  if (compact) {
    const resolved = compactNumberFormatter.resolvedOptions();
    const needsCustomFormatter =
      maximumFractionDigits !== resolved.maximumFractionDigits ||
      (normalizedMinDigits ?? resolved.minimumFractionDigits) !== resolved.minimumFractionDigits;

    if (needsCustomFormatter) {
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits,
        ...(normalizedMinDigits != null ? { minimumFractionDigits: normalizedMinDigits } : {}),
      }).format(value);
    }

    return compactNumberFormatter.format(value);
  }

  const resolved = numberFormatter.resolvedOptions();
  const needsCustomFormatter =
    maximumFractionDigits !== resolved.maximumFractionDigits ||
    (normalizedMinDigits ?? resolved.minimumFractionDigits) !== resolved.minimumFractionDigits;

  if (needsCustomFormatter) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits,
      ...(normalizedMinDigits != null ? { minimumFractionDigits: normalizedMinDigits } : {}),
    }).format(value);
  }

  return numberFormatter.format(value);
}

export function formatPercentage(
  value: number | null | undefined,
  { sign = true, maximumFractionDigits = 2 }: { sign?: boolean; maximumFractionDigits?: number } = {},
) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  const normalizedDigits = Number.isFinite(maximumFractionDigits)
    ? Math.max(0, Number(maximumFractionDigits))
    : (percentageFormatter.resolvedOptions().maximumFractionDigits ?? 2);
  const resolved = percentageFormatter.resolvedOptions();
  const needsCustomFormatter =
    normalizedDigits !== (resolved.maximumFractionDigits ?? 2) ||
    normalizedDigits !== (resolved.minimumFractionDigits ?? 2);
  const formatter = needsCustomFormatter
    ? new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: Math.min(normalizedDigits, resolved.minimumFractionDigits ?? normalizedDigits),
        maximumFractionDigits: normalizedDigits,
      })
    : percentageFormatter;

  const formatted = formatter.format(value / 100);
  if (!sign) {
    return formatted;
  }

  if (value > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

export function formatRelativeTime(timestamp: string | number | null | undefined) {
  if (!timestamp) {
    return "—";
  }

  const targetMs = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  if (Number.isNaN(targetMs)) {
    return "—";
  }

  const deltaMs = Date.now() - targetMs;
  const deltaMinutes = Math.round(deltaMs / 60_000);
  if (deltaMinutes <= 1) {
    return "just now";
  }
  if (deltaMinutes < 60) {
    return `${deltaMinutes} min ago`;
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} hr ago`;
  }
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays} day${deltaDays === 1 ? "" : "s"} ago`;
}

export function getDeltaTone(value: number | null | undefined): "positive" | "negative" | "neutral" {
  if (value == null || Number.isNaN(value) || value === 0) {
    return "neutral";
  }
  return value > 0 ? "positive" : "negative";
}
