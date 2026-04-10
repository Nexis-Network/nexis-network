export function clampNumberParam(
  raw: string | null,
  { fallback, min, max }: { fallback: number; min: number; max: number },
) {
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
