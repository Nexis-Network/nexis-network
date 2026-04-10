const DEFAULT_SEED = "avatar";

function normalizeSeed(seed: string | number | null | undefined): string {
  const raw = typeof seed === "number" ? String(seed) : seed;
  if (!raw) return DEFAULT_SEED;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_SEED;
}

function hashSeed(seed: string): number {
  // FNV-1a 32-bit hash for deterministic avatar generation.
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function safeInitials(seed: string): string {
  const compact = seed
    .replace(/[^a-zA-Z0-9\s_-]/g, " ")
    .split(/[\s_-]+/)
    .filter(Boolean);

  if (compact.length === 0) return "NX";
  if (compact.length === 1) return compact[0].slice(0, 2).toUpperCase();
  return `${compact[0][0]}${compact[compact.length - 1][0]}`.toUpperCase();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function createDeterministicAvatarDataUrl(
  seedInput: string | number | null | undefined,
): string {
  const seed = normalizeSeed(seedInput);
  const hash = hashSeed(seed);

  const hueA = hash % 360;
  const hueB = (hash >>> 8) % 360;
  const hueC = (hash >>> 16) % 360;
  const initials = escapeXml(safeInitials(seed));

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hueA} 72% 58%)"/>
      <stop offset="100%" stop-color="hsl(${hueB} 68% 46%)"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" fill="url(#bg)" rx="18" ry="18"/>
  <circle cx="72" cy="22" r="16" fill="hsl(${hueC} 78% 74% / 0.35)"/>
  <circle cx="20" cy="74" r="20" fill="hsl(${(hueA + hueC) % 360} 78% 74% / 0.28)"/>
  <text x="48" y="55" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI'" font-size="28" font-weight="700" fill="rgba(255,255,255,0.94)">
    ${initials}
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export function resolveAvatarImageSrc(
  source: string | null | undefined,
  fallbackSeed: string | number,
): string {
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (trimmed.length > 0 && !trimmed.startsWith("orb:")) {
      return trimmed;
    }
  }
  return createDeterministicAvatarDataUrl(fallbackSeed);
}
