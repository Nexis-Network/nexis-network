export function calculateLevelProgress(totalXp: number) {
  // Formula: Level = floor(sqrt(xp / 100)) + 1
  // Inverse: Min XP for level L = 100 * (L - 1)^2
  
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
  
  const startXp = 100 * Math.pow(level - 1, 2);
  const endXp = 100 * Math.pow(level, 2);
  
  const progress = Math.min(100, Math.max(0, ((totalXp - startXp) / (endXp - startXp)) * 100));

  return {
    level,
    startXp,
    endXp,
    progress
  };
}
