import {
  AVATAR_V1_ANCHOR_ROWS,
  AVATAR_V1_OVERLAY_SEGMENTS,
  AVATAR_V1_THICK_STROKE_WIDTH,
  AVATAR_V1_VERSION,
  AVATAR_V1_VIEWBOX_SIZE,
  type OverlaySegment,
} from "@/lib/avatar/branded-avatar.config";
import { createPrng, hashSeed } from "@/lib/avatar/branded-avatar.math";

const ANCHOR_ROW_SET = new Set<number>(AVATAR_V1_ANCHOR_ROWS);

export const NON_ANCHOR_MUTATION_CAP = Math.floor(
  AVATAR_V1_OVERLAY_SEGMENTS.filter((segment) => !ANCHOR_ROW_SET.has(segment.y)).length * 0.12,
);

function clampSegment(segment: OverlaySegment): OverlaySegment {
  const x1 = Math.max(0, Math.min(AVATAR_V1_VIEWBOX_SIZE, segment.x1));
  const x2 = Math.max(x1 + 1, Math.min(AVATAR_V1_VIEWBOX_SIZE, segment.x2));

  return Object.freeze({
    x1,
    y: Math.max(0, Math.min(AVATAR_V1_VIEWBOX_SIZE, segment.y)),
    x2,
    strokeWidth: segment.strokeWidth,
  });
}

function mutateSegment(
  segment: OverlaySegment,
  rowDensity: number,
  random: () => number,
): OverlaySegment | null {
  const length = segment.x2 - segment.x1;
  const mutationRoll = Math.floor(random() * 4);

  if (mutationRoll === 0) {
    const maxTrim = Math.min(2, Math.max(0, length - 1));
    if (maxTrim > 0) {
      const trim = 1 + Math.floor(random() * maxTrim);
      return clampSegment({
        ...segment,
        x1: random() < 0.5 ? segment.x1 + trim : segment.x1,
        x2: random() < 0.5 ? segment.x2 : segment.x2 - trim,
      });
    }
  }

  if (mutationRoll === 1) {
    const direction = random() < 0.5 ? -1 : 1;
    if (segment.x1 + direction >= 0 && segment.x2 + direction <= AVATAR_V1_VIEWBOX_SIZE) {
      return clampSegment({
        ...segment,
        x1: segment.x1 + direction,
        x2: segment.x2 + direction,
      });
    }
  }

  if (mutationRoll === 2 || length <= 2) {
    return Object.freeze({
      ...segment,
      strokeWidth: AVATAR_V1_THICK_STROKE_WIDTH,
    });
  }

  if (length <= 2 && rowDensity >= 12 && segment.x1 > 0 && segment.x2 < AVATAR_V1_VIEWBOX_SIZE) {
    return random() < 0.2 ? null : Object.freeze(segment);
  }

  return Object.freeze({
    ...segment,
    strokeWidth: AVATAR_V1_THICK_STROKE_WIDTH,
  });
}

function shuffleIndices(indices: number[], random: () => number): number[] {
  const next = [...indices];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = next[index];
    const swapValue = next[swapIndex];

    if (currentValue == null || swapValue == null) {
      continue;
    }

    next[index] = swapValue;
    next[swapIndex] = currentValue;
  }

  return next;
}

export function mutateOverlaySegments(seed: string): ReadonlyArray<OverlaySegment> {
  const geometryRandom = createPrng(hashSeed(`avatar:v${AVATAR_V1_VERSION}:geometry:${seed}`));
  const mutableIndices = AVATAR_V1_OVERLAY_SEGMENTS.flatMap((segment, index) =>
    ANCHOR_ROW_SET.has(segment.y) ? [] : [index],
  );
  const selectedCount = Math.min(
    NON_ANCHOR_MUTATION_CAP,
    12 + Math.floor(geometryRandom() * 13),
  );
  const selectedIndices = new Set(
    shuffleIndices(mutableIndices, geometryRandom).slice(0, selectedCount),
  );
  const rowDensity = new Map<number, number>();

  for (const segment of AVATAR_V1_OVERLAY_SEGMENTS) {
    rowDensity.set(segment.y, (rowDensity.get(segment.y) ?? 0) + 1);
  }

  return Object.freeze(
    AVATAR_V1_OVERLAY_SEGMENTS.flatMap((segment, index) => {
      if (!selectedIndices.has(index)) {
        return [segment];
      }

      const mutated = mutateSegment(segment, rowDensity.get(segment.y) ?? 0, geometryRandom);
      return mutated ? [mutated] : [];
    }),
  );
}
