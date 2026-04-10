import { AVATAR_V1_BACKGROUND_COLORS, AVATAR_V1_OVERLAY_COLORS } from "@/lib/avatar/branded-avatar.config";

export function hashSeed(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function createPrng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeUsername(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function normalizeWalletAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }

  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

function srgbToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getContrastRatio(left: string, right: string): number {
  const leftValue = Number.parseInt(left.slice(1), 16);
  const rightValue = Number.parseInt(right.slice(1), 16);

  const leftLuminance =
    0.2126 * srgbToLinear((leftValue >> 16) & 255) +
    0.7152 * srgbToLinear((leftValue >> 8) & 255) +
    0.0722 * srgbToLinear(leftValue & 255);
  const rightLuminance =
    0.2126 * srgbToLinear((rightValue >> 16) & 255) +
    0.7152 * srgbToLinear((rightValue >> 8) & 255) +
    0.0722 * srgbToLinear(rightValue & 255);

  const [lighter, darker] =
    leftLuminance >= rightLuminance
      ? [leftLuminance, rightLuminance]
      : [rightLuminance, leftLuminance];

  return (lighter + 0.05) / (darker + 0.05);
}

export function pickBackgroundColor(random: () => number): string {
  const index = Math.floor(random() * AVATAR_V1_BACKGROUND_COLORS.length);
  return AVATAR_V1_BACKGROUND_COLORS[index] ?? AVATAR_V1_BACKGROUND_COLORS[0];
}

export function pickOverlayColor(backgroundColor: string, random: () => number): string {
  const startIndex = Math.floor(random() * AVATAR_V1_OVERLAY_COLORS.length);

  for (let offset = 0; offset < AVATAR_V1_OVERLAY_COLORS.length; offset += 1) {
    const candidate =
      AVATAR_V1_OVERLAY_COLORS[(startIndex + offset) % AVATAR_V1_OVERLAY_COLORS.length] ??
      AVATAR_V1_OVERLAY_COLORS[0];

    if (candidate !== backgroundColor && getContrastRatio(candidate, backgroundColor) >= 3) {
      return candidate;
    }
  }

  return AVATAR_V1_OVERLAY_COLORS[0];
}
