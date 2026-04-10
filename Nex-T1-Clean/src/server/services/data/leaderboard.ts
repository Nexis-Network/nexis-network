type LeaderboardWalletType = "evm" | "solana";

export type LeaderboardSeedRow = {
  rank: number;
  wallet_address: string;
  wallet_type: LeaderboardWalletType;
  pnl_usd: number;
  xp: number;
  referral_fees_usd: number;
  volume_usd: number;
  active_chains: string[];
  avatar_url: string | null;
  display_name: string | null;
};

const CHAIN_UNIVERSE = [
  "ethereum",
  "base",
  "polygon",
  "optimism",
  "arbitrum",
  "solana",
  "avalanche",
  "blast",
  "mantle",
  "sui",
  "aptos",
  "linea",
];

const DISPLAY_NAMES = [
  "Atlas",
  "Cipher",
  "Nebula",
  "Aurora",
  "Helios",
  "Orion",
  "Vesper",
  "Stratus",
  "Zephyr",
  "Quasar",
  "Lumen",
  "Zenith",
];

const baseTimestamp = new Date("2025-10-12T16:30:00Z").toISOString();

const repeatChar = (char: string, length: number) => char.repeat(Math.max(1, length));

const makeEvmAddress = (rank: number): string => {
  const alphabet = "abcdef1234567890";
  let address = "0x";
  for (let i = 0; i < 40; i += 1) {
    const index = (rank + i * 17) % alphabet.length;
    address += alphabet[index];
  }
  return address;
};

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const makeSolAddress = (rank: number): string => {
  let address = "So";
  for (let i = 0; i < 42; i += 1) {
    const index = (rank * 13 + i * 7) % BASE58.length;
    address += BASE58[index];
  }
  return address;
};

const pickChains = (rank: number): string[] => {
  const chainCount = 2 + ((rank + 3) % 3);
  const startIndex = rank % CHAIN_UNIVERSE.length;
  const chains = new Set<string>();
  for (let i = 0; i < chainCount; i += 1) {
    chains.add(CHAIN_UNIVERSE[(startIndex + i) % CHAIN_UNIVERSE.length]);
  }
  return Array.from(chains);
};

const computePnl = (rank: number): number => {
  const base = 95000 - rank * 1100;
  if (rank <= 50) {
    return Math.round(base);
  }
  const drawdown = (rank - 50) * 1800;
  return Math.round(-Math.abs(drawdown) * 0.95);
};

const computeVolume = (rank: number): number => {
  const boost = (101 - rank) * 8800;
  return Math.round(1_250_000 + boost);
};

const computeReferralFees = (rank: number): number => {
  const base = 18_500 - rank * 130;
  return Math.max(0, Math.round(base));
};

const computeXp = (rank: number): number => {
  return Math.round(9_500 - rank * 55);
};

const selectDisplayName = (rank: number): string | null => {
  if (rank > DISPLAY_NAMES.length * 4) {
    return null;
  }
  const index = (rank - 1) % DISPLAY_NAMES.length;
  const suffix = repeatChar("#", Math.floor((rank - 1) / DISPLAY_NAMES.length));
  return `${DISPLAY_NAMES[index]}${suffix}`;
};

const seededEntries: LeaderboardSeedRow[] = Array.from({ length: 100 }).map((_, index) => {
  const rank = index + 1;
  const wallet_type: LeaderboardWalletType = rank % 6 === 0 || rank % 11 === 0 ? "solana" : "evm";
  const wallet_address = wallet_type === "solana" ? makeSolAddress(rank) : makeEvmAddress(rank);
  const pnl_usd = computePnl(rank);
  const xp = computeXp(rank);
  const referral_fees_usd = computeReferralFees(rank);
  const volume_usd = computeVolume(rank);
  const active_chains = pickChains(rank);
  const display_name = selectDisplayName(rank);

  return {
    rank,
    wallet_address,
    wallet_type,
    pnl_usd,
    xp,
    referral_fees_usd,
    volume_usd,
    active_chains,
    avatar_url: null,
    display_name,
  };
});

export const leaderboardSeedPayload = {
  entries: seededEntries,
  updated_at: baseTimestamp,
  sample_size: 3200,
};

export function getLeaderboardSeed() {
  return leaderboardSeedPayload;
}
