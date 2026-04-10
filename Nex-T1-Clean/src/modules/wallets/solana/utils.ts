export function formatSolanaTokenAmount(amount?: string | null, decimals?: number | null) {
  if (!amount) return "0";
  try {
    const dec = typeof decimals === "number" && Number.isFinite(decimals) ? decimals : 9;
    const big = BigInt(amount);
    const base = BigInt(10) ** BigInt(dec);
    const whole = big / base;
    const frac = (big % base).toString().padStart(dec, "0").replace(/0+$/g, "");
    return frac ? `${whole}.${frac}` : whole.toString();
  } catch {
    return amount;
  }
}

export function toLamports(value: string): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parts = trimmed.split(".");
  if (parts.length > 2) return null;
  const whole = parts[0].replace(/\D/g, "");
  const fracRaw = (parts[1] ?? "").replace(/\D/g, "");
  if (!whole && !fracRaw) return null;
  const frac = fracRaw.slice(0, 9).padEnd(9, "0");
  try {
    const wholePart = BigInt(whole || "0") * BigInt(1_000_000_000);
    const fracPart = BigInt(frac || "0");
    return (wholePart + fracPart).toString();
  } catch {
    return null;
  }
}

