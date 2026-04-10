export const INVITE_XP_PER_SUCCESS = 500;

/**
 * XP thresholds defining each level boundary. Values are cumulative.
 * Level N starts at threshold[N] and reaches threshold[N + 1].
 */
export const INVITE_XP_LEVEL_THRESHOLDS = [0, 500, 1500, 3000, 5000, 8000];

export type InviteLevelProgress = {
  level: number;
  currentThreshold: number;
  nextThreshold: number | null;
  progress: number;
};

export function resolveInviteLevel(totalXp: number): InviteLevelProgress {
  const thresholds = INVITE_XP_LEVEL_THRESHOLDS;
  let levelIndex = 0;

  for (let i = 0; i < thresholds.length; i++) {
    if (totalXp >= thresholds[i]) {
      levelIndex = i;
    } else {
      break;
    }
  }

  const currentThreshold = thresholds[levelIndex] ?? 0;
  const nextThreshold = thresholds[levelIndex + 1] ?? null;

  let progress = 1;
  if (nextThreshold !== null) {
    const span = nextThreshold - currentThreshold;
    progress = span > 0 ? Math.min(Math.max((totalXp - currentThreshold) / span, 0), 1) : 1;
  }

  return {
    level: levelIndex,
    currentThreshold,
    nextThreshold,
    progress,
  };
}
