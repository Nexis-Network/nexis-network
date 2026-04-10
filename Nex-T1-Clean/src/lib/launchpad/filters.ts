export type LaunchesCategory = "all" | "live" | "finalized" | "draft" | "erc404";

export type LaunchesSort = "newest" | "progress" | "raised" | "closing" | "risk-low" | "risk-high";

export type LaunchesChainFamily = "all" | "evm" | "solana";

export type LaunchesView = "trending" | "top" | "watchlist" | "new";

export type LaunchesFdv = "all" | "lt100k" | "100k-500k" | "500k-1m" | "1m-10m" | "10m-100m" | "100m-1b" | "gt1b";

export type LaunchesViewMode = "rows" | "cards";

export type LaunchesFilterState = {
  view: LaunchesView;
  query: string;
  category: LaunchesCategory;
  chainFamily: LaunchesChainFamily;
  fdv: LaunchesFdv;
  favorites: string[];
  sort: LaunchesSort;
  hasNft: boolean;
  brandedTokenPage: boolean;
  viewMode: LaunchesViewMode;
};

export const DEFAULT_LAUNCHES_FILTER_STATE: LaunchesFilterState = {
  view: "trending",
  query: "",
  category: "all",
  chainFamily: "all",
  fdv: "all",
  favorites: [],
  sort: "progress",
  hasNft: false,
  brandedTokenPage: false,
  viewMode: "rows",
};

type SearchParams = Record<string, string | string[] | undefined>;

export function parseLaunchesFilterState(search: SearchParams): LaunchesFilterState {
  const viewInput = (takeString(search, "view") ?? "").trim().toLowerCase();
  const view = isLaunchesView(viewInput) ? viewInput : DEFAULT_LAUNCHES_FILTER_STATE.view;

  const query = takeString(search, "q")?.trim() ?? "";

  const categoryInput = (takeString(search, "category") ?? "").trim().toLowerCase();
  const category = isLaunchesCategory(categoryInput) ? categoryInput : DEFAULT_LAUNCHES_FILTER_STATE.category;

  const chainInput = (takeString(search, "chainFamily") ?? "").trim().toLowerCase();
  const chainFamily = isLaunchesChainFamily(chainInput) ? chainInput : DEFAULT_LAUNCHES_FILTER_STATE.chainFamily;

  const fdvInput = (takeString(search, "fdv") ?? "").trim().toLowerCase();
  const fdv = isLaunchesFdv(fdvInput) ? fdvInput : DEFAULT_LAUNCHES_FILTER_STATE.fdv;

  const favorites = parseFavoritesParam(takeString(search, "favorites"));

  const sortInput = (takeString(search, "sort") ?? "").trim().toLowerCase();
  const sort = isLaunchesSort(sortInput) ? sortInput : defaultSortForView(view);

  const hasNft = parseBooleanParam(takeString(search, "hasNft"));
  const brandedTokenPage = parseBooleanParam(takeString(search, "brandedTokenPage"));

  const viewModeInput = (takeString(search, "viewMode") ?? "").trim().toLowerCase();
  const viewMode = isLaunchesViewMode(viewModeInput) ? viewModeInput : DEFAULT_LAUNCHES_FILTER_STATE.viewMode;

  return { view, query, category, chainFamily, fdv, favorites, sort, hasNft, brandedTokenPage, viewMode };
}

function takeString(search: SearchParams, key: keyof SearchParams): string | undefined {
  const value = search[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function isLaunchesCategory(value: string): value is LaunchesCategory {
  return value === "all" || value === "live" || value === "finalized" || value === "draft" || value === "erc404";
}

function isLaunchesView(value: string): value is LaunchesView {
  return value === "trending" || value === "top" || value === "watchlist" || value === "new";
}

function isLaunchesSort(value: string): value is LaunchesSort {
  return (
    value === "newest" ||
    value === "progress" ||
    value === "raised" ||
    value === "closing" ||
    value === "risk-low" ||
    value === "risk-high"
  );
}

function isLaunchesChainFamily(value: string): value is LaunchesChainFamily {
  return value === "all" || value === "evm" || value === "solana";
}

function isLaunchesFdv(value: string): value is LaunchesFdv {
  return (
    value === "all" ||
    value === "lt100k" ||
    value === "100k-500k" ||
    value === "500k-1m" ||
    value === "1m-10m" ||
    value === "10m-100m" ||
    value === "100m-1b" ||
    value === "gt1b"
  );
}

function parseFavoritesParam(value: string | undefined): string[] {
  if (!value) return [];
  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(parsed));
}

function parseBooleanParam(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function isLaunchesViewMode(value: string): value is LaunchesViewMode {
  return value === "rows" || value === "cards";
}

export function defaultSortForView(view: LaunchesView): LaunchesSort {
  if (view === "top") return "raised";
  if (view === "new") return "newest";
  if (view === "watchlist") return "newest";
  return "progress";
}
