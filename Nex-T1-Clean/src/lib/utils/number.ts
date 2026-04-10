type CurrencyFormatOptions = {
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signDisplay?: "auto" | "never" | "always" | "exceptZero";
};

type NumberFormatOptions = {
  compact?: boolean;
  maximumFractionDigits?: number;
};

const buildCurrencyFormatter = (options?: CurrencyFormatOptions): Intl.NumberFormat => {
  const maximumFractionDigits = options?.maximumFractionDigits ?? (options?.compact ? 1 : 2);
  const minimumFractionDigits =
    options?.minimumFractionDigits ??
    (options?.compact ? 0 : Math.min(2, maximumFractionDigits));

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits,
    minimumFractionDigits,
    signDisplay: options?.signDisplay ?? "auto",
  });
};

const buildNumberFormatter = (options?: NumberFormatOptions): Intl.NumberFormat => {
  return new Intl.NumberFormat("en-US", {
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: options?.maximumFractionDigits ?? (options?.compact ? 1 : 0),
  });
};

export const formatUsd = (value: number, options?: CurrencyFormatOptions): string => {
  if (!Number.isFinite(value)) {
    return "$0";
  }
  return buildCurrencyFormatter(options).format(value);
};

export const formatSignedUsd = (value: number, options?: CurrencyFormatOptions): string => {
  return formatUsd(value, { ...options, signDisplay: "always" });
};

export const formatNumber = (value: number, options?: NumberFormatOptions): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return buildNumberFormatter(options).format(value);
};
