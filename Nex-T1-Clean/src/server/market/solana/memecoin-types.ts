import "server-only";

export type SolanaCluster = "mainnet-beta" | "devnet";

export type MemecoinUniverse = "pumpfun_bonding" | "pumpfun_new" | "pumpfun_graduated" | "birdeye_meme_list";

export type MemecoinCandidate = {
  universe: MemecoinUniverse;
  mint: string; // base58
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
};

export type MemecoinEnrichment = {
  mint: string;
  bondingProgress: number | null; // 0-100 when available
  pairAddress: string | null;
  pairStats: {
    priceUsd: number | null;
    liquidityUsd: number | null;
    volume24hUsd: number | null;
    marketCapUsd: number | null;
    fdvUsd: number | null;
  } | null;
  trend: {
    timeframe: "15m" | "1h" | "4h";
    candleCount: number;
    returnPct: number | null;
    volatilityPct: number | null;
  } | null;
  swapsSummary: {
    sampleSize: number;
    buys: number | null;
    sells: number | null;
    buySellRatio: number | null;
    uniqueTraders: number | null;
    topTraderShare: number | null; // 0-1 when derivable
  } | null;

  birdeye: {
    supply: number | null;
    circulatingSupply: number | null;
    security: {
      creatorAddress: string;
      creationTime: number;
      creationTx: string;
      mintTx: string;
      deployerBalance?: number;
      ownerBalance?: number;
      isTrueToken?: boolean;
      isHoneypot?: boolean;
    } | null;
    tradeData: {
      volume24hUsd: number | null;
      buy24hUsd: number | null;
      sell24hUsd: number | null;
      uniqueWallets24h: number | null;
      tradeCount24h: number | null;
    } | null;
    holdersSummary: {
      sampleSize: number;
      top1SharePct: number | null; // 0..1
      top10SharePct: number | null; // 0..1
    } | null;
    kolSummary: {
      walletCount: number;
      lookbackMinutes: number;
      buys: number;
      sells: number;
      uniqueKolTraders: number;
      lastTradeAt: number | null; // unix seconds
    } | null;
  } | null;

  helius: {
    signaturesSampleSize: number;
    txDetailsSampleSize: number;
    uniqueFeePayers: number;
    uniqueBuyers: number;
    uniqueBuyLikeBuyers: number;
    uniqueTransferLikeBuyers: number;
    uniqueSellers: number;
    uniqueFreshBuyers: number;
    uniqueFreshBuyLikeBuyers: number;
    buyLikeTxCount: number;
    transferLikeTxCount: number;
    jitoTipTxCount: number;
    maxTxsInSlot: number;
    maxBuyLikeTxsInSlot: number;
    maxUniqueFeePayersInSlot: number;
    maxUniqueBuyersInSlot: number;
    maxUniqueBuyLikeBuyersInSlot: number;
    slotsObserved: number;
    firstSeenUnix: number | null;
    lastSeenUnix: number | null;
    earlyWindowSeconds: number | null;
    earlyTxs: number | null;
    earlyUniqueFeePayers: number | null;
    earlyUniqueBuyers: number | null;
    earlyUniqueFreshBuyers: number | null;
    earlyUniqueBuyLikeBuyers: number | null;
    earlyUniqueFreshBuyLikeBuyers: number | null;
    suspectedBundlerScore: number; // 0..1
    suspectedSniperScore: number; // 0..1
  } | null;
};

export type MemecoinRow = {
  candidate: MemecoinCandidate;
  enrichment: MemecoinEnrichment;
};
