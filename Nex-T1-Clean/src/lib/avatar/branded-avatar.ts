import {
  AVATAR_V1_BASE_STROKE_WIDTH,
  AVATAR_V1_VERSION,
  AVATAR_V1_VIEWBOX_SIZE,
  type OverlaySegment,
} from "@/lib/avatar/branded-avatar.config";
import {
  createPrng,
  hashSeed,
  normalizeUsername,
  normalizeWalletAddress,
  pickBackgroundColor,
  pickOverlayColor,
} from "@/lib/avatar/branded-avatar.math";
import {
  mutateOverlaySegments,
} from "@/lib/avatar/branded-avatar.utils";

export {
  AVATAR_V1_OVERLAY_SEGMENTS,
  type OverlaySegment,
} from "@/lib/avatar/branded-avatar.config";

interface NormalizeAvatarSeedInput {
  readonly walletAddress?: string | null | undefined;
  readonly username?: string | null | undefined;
}

export interface AvatarRenderOptions {
  readonly rounded?: boolean | undefined;
  readonly size?: number | undefined;
}

export interface AvatarSpec {
  readonly version: typeof AVATAR_V1_VERSION;
  readonly seed: string;
  readonly backgroundColor: string;
  readonly overlayColor: string;
  readonly strokeWidth: number;
  readonly segments: ReadonlyArray<OverlaySegment>;
  readonly pathData: string;
  readonly fingerprint: string;
}

const DEFAULT_RENDER_SIZE = 64;
const specCache = new Map<string, AvatarSpec>();

export function normalizeAvatarSeed({
  walletAddress,
  username,
}: NormalizeAvatarSeedInput): string | null {
  return normalizeWalletAddress(walletAddress) ?? normalizeUsername(username);
}

function buildPathData(segments: ReadonlyArray<OverlaySegment>): string {
  return segments.map((segment) => `M${segment.x1} ${segment.y}H${segment.x2}`).join("");
}

function buildFingerprint(spec: Omit<AvatarSpec, "fingerprint">): string {
  const encodedSegments = spec.segments
    .map((segment) => `${segment.x1},${segment.y},${segment.x2},${segment.strokeWidth}`)
    .join(";");

  return `v${spec.version}|${spec.seed}|${spec.backgroundColor}|${spec.overlayColor}|${encodedSegments}`;
}

export function groupPathDataByStrokeWidth(
  segments: ReadonlyArray<OverlaySegment>,
): ReadonlyArray<readonly [number, string]> {
  const grouped = new Map<number, string[]>();

  for (const segment of segments) {
    const bucket = grouped.get(segment.strokeWidth) ?? [];
    bucket.push(`M${segment.x1} ${segment.y}H${segment.x2}`);
    grouped.set(segment.strokeWidth, bucket);
  }

  return [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([strokeWidth, paths]) => [strokeWidth, paths.join("")] as const);
}

export function buildAvatarClipId(spec: AvatarSpec): string {
  return `avatar-clip-${hashSeed(spec.fingerprint).toString(36)}`;
}

export function generateAvatarSpec(seed: string): AvatarSpec {
  const cached = specCache.get(seed);
  if (cached) {
    return cached;
  }

  const paletteRandom = createPrng(hashSeed(`avatar:v${AVATAR_V1_VERSION}:palette:${seed}`));
  const backgroundColor = pickBackgroundColor(paletteRandom);
  const overlayColor = pickOverlayColor(backgroundColor, paletteRandom);
  const segments = mutateOverlaySegments(seed);
  const pathData = buildPathData(segments);
  const baseSpec = {
    version: AVATAR_V1_VERSION,
    seed,
    backgroundColor,
    overlayColor,
    strokeWidth: AVATAR_V1_BASE_STROKE_WIDTH,
    segments,
    pathData,
  } satisfies Omit<AvatarSpec, "fingerprint">;
  const spec = Object.freeze({
    ...baseSpec,
    fingerprint: buildFingerprint(baseSpec),
  });

  specCache.set(seed, spec);
  return spec;
}

export function generateAvatarSvgString(
  seed: string,
  options: AvatarRenderOptions = {},
): string {
  const size = options.size ?? DEFAULT_RENDER_SIZE;
  const rounded = options.rounded ?? true;
  const spec = generateAvatarSpec(seed);
  const groupedPaths = groupPathDataByStrokeWidth(spec.segments);
  const clipId = buildAvatarClipId(spec);
  const pathMarkup = groupedPaths
    .map(
      ([strokeWidth, pathData]) =>
        `<path d="${pathData}" stroke="${spec.overlayColor}" stroke-width="${strokeWidth}"/>`,
    )
    .join("");
  const content = `<rect width="${AVATAR_V1_VIEWBOX_SIZE}" height="${AVATAR_V1_VIEWBOX_SIZE}" fill="${spec.backgroundColor}"/>${pathMarkup}`;

  if (!rounded) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${AVATAR_V1_VIEWBOX_SIZE} ${AVATAR_V1_VIEWBOX_SIZE}" fill="none" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${AVATAR_V1_VIEWBOX_SIZE} ${AVATAR_V1_VIEWBOX_SIZE}" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${clipId}"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#${clipId})">${content}</g></svg>`;
}
