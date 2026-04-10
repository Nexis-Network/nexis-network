import { createTool, createToolSchema, booleanProp, enumProp, numberProp, objectProp, stringProp } from "./create-tool";
import { PumpFunV2Artifact, type PumpFunV2ArtifactData } from "@/modules/ai/artifacts/pumpfun-v2";
import { fetchMemecoinCandidates, enrichMemecoinRows } from "@/server/market/solana/memecoin-discovery";
import { memecoinAutotradeParamsSchema, scoreMemecoin } from "@/server/market/solana/memecoin-scoring";
import { buildPumpfunDashboardArtifact } from "@/server/services/pumpfun/dashboard-artifact";
import { listCdpWalletAccountRecords } from "@/server/wallets/user-wallets";

type PumpfunMarketAction = "discover" | "inspect" | "prepare_buy" | "prepare_sell";
type PumpfunMarketCluster = "mainnet-beta" | "devnet";
type PumpfunMarketUniverse = "new" | "bonding" | "graduated";
type PumpfunSortBy = "opportunity_score" | "newest" | "volume_24h" | "migration_progress";
type PumpfunRiskProfile = "conservative" | "balanced" | "degen";

type PumpfunMarketInput = {
  action: PumpfunMarketAction;
  cluster?: PumpfunMarketCluster;
  universe?: PumpfunMarketUniverse;
  mint?: string;
  limit?: number;
  sortBy?: PumpfunSortBy;
  riskProfile?: PumpfunRiskProfile;
  buy?: {
    amountSol?: number;
    slippageBps?: number;
  };
  sell?: {
    percentOfPosition?: number;
    slippageBps?: number;
  };
  openArtifact?: boolean;
};

type PumpfunMarketOutput = {
  status: "ok" | "awaiting_user_action";
  action: PumpfunMarketAction;
  summary: string;
  data: Record<string, UntypedJson>;
  parts?: Array<{ type: string; data: UntypedJson }>;
};

const ACTIONS = ["discover", "inspect", "prepare_buy", "prepare_sell"] as const;
const CLUSTERS = ["mainnet-beta", "devnet"] as const;
const UNIVERSES = ["new", "bonding", "graduated"] as const;
const SORT_OPTIONS = [
  "opportunity_score",
  "newest",
  "volume_24h",
  "migration_progress",
] as const;
const RISK_PROFILES = ["conservative", "balanced", "degen"] as const;
const ARTIFACT_PART_TYPE = `data-artifact-${PumpFunV2Artifact.id}` as const;
type PumpfunOpportunityItem = Extract<
  PumpFunV2ArtifactData,
  { view: "opportunity-list" }
>["items"][number];

const schema = createToolSchema(
  {
    action: enumProp(
      "Discover, inspect, or prepare a Pump.fun token trade in the interactive right-side artifact panel.",
      ACTIONS,
    ),
    cluster: enumProp("Solana cluster", CLUSTERS, "mainnet-beta"),
    universe: enumProp("Discovery universe", UNIVERSES, "new"),
    mint: stringProp("Token mint address for inspect or prepare actions."),
    limit: numberProp("Max items to return for discovery.", {
      minimum: 1,
      maximum: 25,
      default: 8,
    }),
    sortBy: enumProp("How discovery results should be sorted.", SORT_OPTIONS, "opportunity_score"),
    riskProfile: enumProp("Risk appetite used to tune deterministic scoring gates.", RISK_PROFILES, "balanced"),
    buy: objectProp(
      "Default buy controls for the trade panel.",
      {
        amountSol: numberProp("How much SOL to spend.", {
          minimum: 0.01,
          maximum: 10,
          default: 0.05,
        }),
        slippageBps: numberProp("Slippage in basis points.", {
          minimum: 1,
          maximum: 5000,
          default: 500,
        }),
      },
    ),
    sell: objectProp(
      "Default sell controls for the trade panel.",
      {
        percentOfPosition: numberProp("Percent of the held position to sell.", {
          minimum: 1,
          maximum: 100,
          default: 25,
        }),
        slippageBps: numberProp("Slippage in basis points.", {
          minimum: 1,
          maximum: 5000,
          default: 500,
        }),
      },
    ),
    openArtifact: booleanProp("Emit the pumpfun-v2 artifact panel.", true),
  },
  ["action"],
  { additionalProperties: false },
);

function normalizeUniverse(universe: PumpfunMarketUniverse) {
  switch (universe) {
    case "bonding":
      return "pumpfun_bonding" as const;
    case "graduated":
      return "pumpfun_graduated" as const;
    default:
      return "pumpfun_new" as const;
  }
}

function resolveRiskOverrides(riskProfile: PumpfunRiskProfile) {
  switch (riskProfile) {
    case "conservative":
      return {
        minLiquidityUsd: 20_000,
        minVolume24hUsd: 10_000,
        maxTopTraderShare: 0.18,
        minUniqueTraders: 60,
      };
    case "degen":
      return {
        minLiquidityUsd: 3_000,
        minVolume24hUsd: 1_000,
        maxMarketCapUsd: 500_000,
        maxTopTraderShare: 0.35,
        minUniqueTraders: 10,
      };
    default:
      return {};
  }
}

function resolveWallet(address?: string | null) {
  return {
    source: "cdp_embedded_solana" as const,
    address: address ?? null,
    connected: Boolean(address),
  };
}

async function resolveUserSolanaWallet(userId?: string) {
  if (!userId) return null;
  const wallets = await listCdpWalletAccountRecords(userId);
  return (
    wallets.find(
      (wallet) =>
        wallet.platform === "solana" &&
        wallet.status === "ready" &&
        typeof wallet.address === "string" &&
        wallet.address.length > 0,
    )?.address ?? null
  );
}

function mapConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function buildDiscoveryArtifact(params: {
  cluster: PumpfunMarketCluster;
  universe: PumpfunMarketUniverse;
  items: PumpfunOpportunityItem[];
  walletAddress?: string | null;
}): PumpFunV2ArtifactData {
  return {
    view: "opportunity-list",
    generatedAt: new Date().toISOString(),
    cluster: params.cluster,
    universe: params.universe,
    items: params.items,
    wallet: resolveWallet(params.walletAddress),
  };
}

function emitArtifactIfNeeded(
  openArtifact: boolean,
  payload: PumpFunV2ArtifactData,
): PumpfunMarketOutput["parts"] {
  if (!openArtifact) return undefined;
  return [
    {
      type: ARTIFACT_PART_TYPE,
      data: payload,
    },
  ];
}

export const pumpfunMarketTool = createTool<PumpfunMarketInput, PumpfunMarketOutput>({
  description:
    "Discover, inspect, and prepare Pump.fun trading flows with Moralis market data and the authenticated user's Nex Wallet (SOL). Use this instead of manually combining Pump.fun read tools with artifact emission for user-facing workflows.",
  schema,
  execute: async (input, context): Promise<PumpfunMarketOutput> => {
    const action = input.action;
    const cluster = input.cluster ?? "mainnet-beta";
    const universe = input.universe ?? "new";
    const limit = Math.min(25, Math.max(1, Math.trunc(input.limit ?? 8)));
    const riskProfile = input.riskProfile ?? "balanced";
    const sortBy = input.sortBy ?? "opportunity_score";
    const openArtifact = input.openArtifact ?? true;
    const walletAddress = await resolveUserSolanaWallet(context?.userId);
    const buyAmountSol = input.buy?.amountSol ?? 0.05;
    const sellPercent = input.sell?.percentOfPosition ?? 25;
    const slippageBps = input.buy?.slippageBps ?? input.sell?.slippageBps ?? 500;

    if ((action === "inspect" || action === "prepare_buy" || action === "prepare_sell") && !input.mint) {
      throw new Error("mint_required");
    }

    if (action === "discover") {
      const discoveryUniverse = normalizeUniverse(universe);
      const scoreParams = memecoinAutotradeParamsSchema.parse({
        kind: "solana_memecoin_autotrade",
        cluster,
        universe: discoveryUniverse,
        candidateLimit: Math.min(80, Math.max(limit * 4, 20)),
        enrichTopN: Math.min(40, Math.max(limit * 2, 12)),
        ...resolveRiskOverrides(riskProfile),
      });

      const candidates = await fetchMemecoinCandidates({
        universe: discoveryUniverse,
        cluster,
        limit: scoreParams.candidateLimit,
      });
      const rows = await enrichMemecoinRows({
        cluster,
        candidates: candidates.slice(0, scoreParams.enrichTopN),
        heliusSignatureLimit: scoreParams.heliusSignatureLimit,
        heliusTxDetailLimit: scoreParams.heliusTxDetailLimit,
      });

      const scoredItems = rows.map((row) => {
        const score = scoreMemecoin(row, scoreParams);
        const priceUsd = row.enrichment.pairStats?.priceUsd ?? row.candidate.priceUsd ?? null;
        const liquidityUsd =
          row.enrichment.pairStats?.liquidityUsd ?? row.candidate.liquidityUsd ?? null;
        const volume24hUsd =
          row.enrichment.pairStats?.volume24hUsd ?? row.candidate.volume24hUsd ?? null;
        const marketCapUsd =
          row.enrichment.pairStats?.marketCapUsd ?? row.candidate.marketCapUsd ?? null;
        return {
          createdAt: row.candidate.createdAt,
          token: {
            mint: row.candidate.mint,
            name: row.candidate.name ?? "Unknown",
            symbol: row.candidate.symbol ?? "PUMP",
            logoUrl: row.candidate.imageUrl,
            priceUsd,
            marketCapUsd,
            liquidityUsd,
            volume24hUsd,
            migrationProgressPct: row.enrichment.bondingProgress,
            pairAddress: row.enrichment.pairAddress,
            website: null,
            twitter: null,
            telegram: null,
          },
          score: {
            opportunityScore: score.score,
            confidence: mapConfidence(score.score),
            reasons: score.reasons.slice(0, 4),
          },
        };
      });

      scoredItems.sort((left, right) => {
        if (sortBy === "volume_24h") {
          return (right.token.volume24hUsd ?? 0) - (left.token.volume24hUsd ?? 0);
        }
        if (sortBy === "migration_progress") {
          return (right.token.migrationProgressPct ?? 0) - (left.token.migrationProgressPct ?? 0);
        }
        if (sortBy === "newest") {
          return Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? "");
        }
        return right.score.opportunityScore - left.score.opportunityScore;
      });

      const items = scoredItems.slice(0, limit).map(({ token, score }) => ({
        token,
        score,
      }));
      const artifact = buildDiscoveryArtifact({
        cluster,
        universe,
        items,
        walletAddress,
      });

      return {
        status: "ok",
        action,
        summary: `Found ${items.length} Pump.fun candidates ranked by ${sortBy.replace(/_/g, " ")}.`,
        data: {
          cluster,
          universe,
          items,
        },
        parts: emitArtifactIfNeeded(openArtifact, artifact),
      };
    }

    const artifact = await buildPumpfunDashboardArtifact({
      cluster,
      mint: input.mint!,
      walletAddress,
      buyAmountSol,
      sellPercent,
      slippageBps,
      forceCanBuy: action === "prepare_buy" ? cluster === "mainnet-beta" : undefined,
      forceCanSell: action === "prepare_sell" ? cluster === "mainnet-beta" : undefined,
    });

    return {
      status: action === "inspect" ? "ok" : "awaiting_user_action",
      action,
      summary:
        action === "inspect"
          ? `Opened the Pump.fun dashboard for ${artifact.token.symbol}.`
          : `Prepared the Pump.fun ${action === "prepare_buy" ? "buy" : "sell"} panel for ${artifact.token.symbol}.`,
      data: {
        cluster,
        mint: input.mint!,
        walletAddress,
        artifact,
      },
      parts: emitArtifactIfNeeded(openArtifact, artifact),
    };
  },
});
