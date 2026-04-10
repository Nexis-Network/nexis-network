export const XP_TIER_THRESHOLDS = [
  0,
  1_500,
  5_000,
  12_000,
  25_000,
  50_000,
  90_000,
  150_000,
] as const;

export type XpTierNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type XpTierInfo = {
  tier: XpTierNumber;
  badgePath: string;
  minXp: number;
  nextMinXp: number | null;
  xpToNextTier: number;
  tierProgressPct: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getBadgePathForTier(tier: XpTierNumber): string {
  return `/assets/profile-badges/tier-${tier}.svg`;
}

export function resolveXpTier(totalXp: number): XpTierInfo {
  const normalizedXp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;

  let tierIndex = 0;
  for (let i = 0; i < XP_TIER_THRESHOLDS.length; i += 1) {
    if (normalizedXp >= XP_TIER_THRESHOLDS[i]) {
      tierIndex = i;
    } else {
      break;
    }
  }

  const tier = (tierIndex + 1) as XpTierNumber;
  const minXp = XP_TIER_THRESHOLDS[tierIndex] ?? 0;
  const nextMinXp = XP_TIER_THRESHOLDS[tierIndex + 1] ?? null;
  const xpToNextTier = nextMinXp === null ? 0 : Math.max(0, nextMinXp - normalizedXp);

  let tierProgressPct = 100;
  if (nextMinXp !== null) {
    const span = nextMinXp - minXp;
    const progressValue = span > 0 ? ((normalizedXp - minXp) / span) * 100 : 100;
    tierProgressPct = clamp(progressValue, 0, 100);
  }

  return {
    tier,
    badgePath: getBadgePathForTier(tier),
    minXp,
    nextMinXp,
    xpToNextTier,
    tierProgressPct,
  };
}
