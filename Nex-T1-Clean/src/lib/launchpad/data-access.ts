import type {
  LaunchesCategory,
  LaunchesFdv,
  LaunchesFilterState,
  LaunchesSort,
  LaunchesView,
} from "@/lib/launchpad/filters";
import { getLaunchpadCampaigns } from "@/lib/launchpad/api";
import type { LaunchpadCampaignItem, LaunchpadCampaignStatus } from "@/lib/launchpad/types";

const DEFAULT_STATUSES: LaunchpadCampaignStatus[] = ["active", "finalized", "draft", "cancelled"];

const CATEGORY_ORDER: LaunchesCategory[] = ["all", "live", "finalized", "draft", "erc404"];
const VIEW_ORDER: LaunchesView[] = ["trending", "top", "watchlist", "new"];

export type LaunchesData = {
  items: LaunchpadCampaignItem[];
  counts: Record<LaunchesCategory, number>;
  viewCounts: Record<LaunchesView, number>;
  stats: {
    activeCampaigns: number;
    totalRaisedBaseUnits: string;
    avgProgressPct: string;
  };
};

export async function getLaunchesData(filters: LaunchesFilterState): Promise<LaunchesData> {
  const fetchedCampaigns = await getLaunchpadCampaigns(
    { scope: "all", status: DEFAULT_STATUSES, limit: 100 },
    { revalidate: false },
  ).catch(() => []);
  const campaigns = fetchedCampaigns;

  const query = filters.query.trim().toLowerCase();
  const favoriteSet = new Set(filters.favorites);

  const scopedByChain = campaigns.filter((campaign) =>
    filters.chainFamily === "all" ? true : campaign.chainFamily === filters.chainFamily,
  );

  const scopedByQuery = scopedByChain.filter((campaign) => matchesQuery(campaign, query));
  const scopedByFdv = scopedByQuery.filter((campaign) => matchesFdv(campaign, filters.fdv));
  const scopedByFeature = scopedByFdv.filter((campaign) => {
    if (filters.hasNft && !matchesHasNft(campaign)) return false;
    if (filters.brandedTokenPage && !matchesBrandedTokenPage(campaign)) return false;
    return true;
  });
  const counts = computeCategoryCounts(scopedByFeature);
  const viewCounts = computeViewCounts(scopedByFeature, favoriteSet);
  const viewed = scopedByFeature.filter((campaign) => matchesView(campaign, filters.view, favoriteSet));
  const categorized = viewed.filter((campaign) => matchesCategory(campaign, filters.category));
  const sorted = sortCampaigns(categorized, filters.sort);

  const totalRaised = sorted.reduce((acc, campaign) => acc + toBigInt(campaign.raisedBaseUnits), 0n);
  const activeCampaigns = sorted.filter((campaign) => campaign.status === "active").length;
  const avgProgress =
    sorted.length > 0
      ? sorted.reduce((acc, campaign) => acc + campaign.progressBps, 0) / sorted.length / 100
      : 0;

  return {
    items: sorted,
    counts,
    viewCounts,
    stats: {
      activeCampaigns,
      totalRaisedBaseUnits: formatInteger(totalRaised),
      avgProgressPct: avgProgress.toFixed(1),
    },
  };
}

function computeViewCounts(items: LaunchpadCampaignItem[], favorites: Set<string>): Record<LaunchesView, number> {
  const counts = Object.fromEntries(VIEW_ORDER.map((view) => [view, 0])) as Record<LaunchesView, number>;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  counts.trending = items.length;
  counts.top = items.length;
  for (const campaign of items) {
    if (campaign.position || favorites.has(campaign.id)) counts.watchlist += 1;
    if (new Date(campaign.createdAt).getTime() >= weekAgo) counts.new += 1;
  }

  return counts;
}

function computeCategoryCounts(items: LaunchpadCampaignItem[]): Record<LaunchesCategory, number> {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0])) as Record<
    LaunchesCategory,
    number
  >;

  counts.all = items.length;
  for (const campaign of items) {
    if (campaign.status === "active") counts.live += 1;
    if (campaign.status === "finalized") counts.finalized += 1;
    if (campaign.status === "draft") counts.draft += 1;
    if (campaign.tokenStandard === "erc404") counts.erc404 += 1;
  }

  return counts;
}

function matchesCategory(campaign: LaunchpadCampaignItem, category: LaunchesCategory): boolean {
  if (category === "all") return true;
  if (category === "live") return campaign.status === "active";
  if (category === "finalized") return campaign.status === "finalized";
  if (category === "draft") return campaign.status === "draft";
  if (category === "erc404") return campaign.tokenStandard === "erc404";
  return true;
}

function matchesView(campaign: LaunchpadCampaignItem, view: LaunchesView, favorites: Set<string>): boolean {
  if (view === "watchlist") return Boolean(campaign.position) || favorites.has(campaign.id);
  if (view === "new") {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(campaign.createdAt).getTime() >= weekAgo;
  }
  return true;
}

/**
 * Approximate FDV filter.
 *
 * `campaign.targetBaseUnits` is stored in raw base units (e.g. wei for EVM,
 * lamports for Solana). The FDV filter labels represent USD ranges, but we
 * don't have a real-time price feed here. We convert base units back to
 * token-denominated units using the chain's native decimals (18 for EVM,
 * 9 for Solana) and treat the resulting value as a rough proxy for USD
 * valuation. This is a best-effort client-side filter.
 */
function matchesFdv(campaign: LaunchpadCampaignItem, fdv: LaunchesFdv): boolean {
  if (fdv === "all") return true;

  // Convert raw base-units to token-denominated units for comparison.
  const decimals = campaign.chainFamily === "solana" ? 9 : 18;
  const raw = toBigInt(campaign.targetBaseUnits);
  if (raw === 0n) return false;

  // Divide by 10^decimals to get token-unit value, using floating-point
  // division for the comparison (sufficient precision for filter buckets).
  const tokenValue = Number(raw) / Math.pow(10, decimals);
  if (!Number.isFinite(tokenValue)) return false;

  if (fdv === "lt100k") return tokenValue < 100_000;
  if (fdv === "100k-500k") return tokenValue >= 100_000 && tokenValue < 500_000;
  if (fdv === "500k-1m") return tokenValue >= 500_000 && tokenValue < 1_000_000;
  if (fdv === "1m-10m") return tokenValue >= 1_000_000 && tokenValue < 10_000_000;
  if (fdv === "10m-100m") return tokenValue >= 10_000_000 && tokenValue < 100_000_000;
  if (fdv === "100m-1b") return tokenValue >= 100_000_000 && tokenValue < 1_000_000_000;
  return tokenValue >= 1_000_000_000;
}

function matchesHasNft(campaign: LaunchpadCampaignItem): boolean {
  if (campaign.tokenStandard === "erc404") return true;
  return toBoolean(campaign.launchControls.hasNft);
}

function matchesBrandedTokenPage(campaign: LaunchpadCampaignItem): boolean {
  if (campaign.shareTokenAddress) return true;
  return toBoolean(campaign.launchControls.brandedTokenPage);
}

function matchesQuery(campaign: LaunchpadCampaignItem, query: string): boolean {
  if (!query) return true;
  const haystack = [
    campaign.agent.name,
    campaign.agent.slug,
    campaign.chainRef,
    campaign.status,
    campaign.tokenStandard,
    ...campaign.riskFlags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function sortCampaigns(items: LaunchpadCampaignItem[], sort: LaunchesSort): LaunchpadCampaignItem[] {
  const sorted = [...items];
  sorted.sort((left, right) => {
    if (sort === "progress") {
      return right.progressBps - left.progressBps;
    }

    if (sort === "raised") {
      return compareBigIntDesc(left.raisedBaseUnits, right.raisedBaseUnits);
    }

    if (sort === "closing") {
      return compareClosingAsc(left.closeTs, right.closeTs);
    }

    if (sort === "risk-low") {
      return left.riskScore - right.riskScore;
    }

    if (sort === "risk-high") {
      return right.riskScore - left.riskScore;
    }

    return compareDateDesc(left.createdAt, right.createdAt);
  });
  return sorted;
}

function compareDateDesc(leftIso: string, rightIso: string): number {
  return new Date(rightIso).getTime() - new Date(leftIso).getTime();
}

function compareClosingAsc(leftIso: string | null, rightIso: string | null): number {
  if (!leftIso && !rightIso) return 0;
  if (!leftIso) return 1;
  if (!rightIso) return -1;
  return new Date(leftIso).getTime() - new Date(rightIso).getTime();
}

function compareBigIntDesc(leftRaw: string, rightRaw: string): number {
  const left = toBigInt(leftRaw);
  const right = toBigInt(rightRaw);
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

function toBigInt(value: string): bigint {
  if (!/^\d+$/.test(value)) return 0n;
  return BigInt(value);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function formatInteger(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
