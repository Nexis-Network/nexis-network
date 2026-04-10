export type LeaderboardWalletType = "evm" | "solana";

export type LeaderboardEntry = {
  rank: number;
  walletAddress: string;
  walletType: LeaderboardWalletType;
  pnlUsd: number;
  xp: number;
  referralFeesUsd: number;
  volumeUsd: number;
  activeChains: string[];
  avatarUrl?: string | null;
  displayName?: string | null;
  level?: number;
  loginStreak?: number;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  updatedAt: string | null;
  sampleSize?: number | null;
  source?: "realtime" | "seeded";
};
