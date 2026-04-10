export function formatNativeBalance(value: string | number | null | undefined, maxDecimals = 4): string {
  if (value == null) {
    return "0.0000";
  }

  let numeric: number;
  if (typeof value === "number") {
    numeric = value;
  } else if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    numeric = Number.isFinite(parsed) ? parsed : 0;
  } else {
    numeric = 0;
  }

  if (!Number.isFinite(numeric)) {
    return "0.0000";
  }

  return numeric.toFixed(maxDecimals).replace(/\.?0+$/, "");
}
