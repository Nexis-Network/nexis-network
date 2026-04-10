export type CryptorankTokenUnlock = {
  id: string;
  slug: string;
  symbol: string;
  name: string;
  rank: number | null;
  marketCapUsd: number | null;
  nextUnlockDate: string | null;
  nextUnlockValueUsd: number | null;
  nextUnlockOfCirculating: number | null;
  nextUnlockOfSupply: number | null;
};

