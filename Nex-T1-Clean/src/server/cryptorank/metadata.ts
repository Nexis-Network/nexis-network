// AUTO-GENERATED DATA LOADER (paged)
// If the upstream spec changes, regenerate pages in src/server/cryptorank/data/pages/*

export type CryptorankEndpointId =
  | "currencies_list"
  | "currencies_categories"
  | "currencies_fiat"
  | "currencies_funding_rounds"
  | "currencies_historical"
  | "currencies_map"
  | "currencies_public_sales"
  | "currencies_tags"
  | "currencies_token_unlock"
  | "currencies_search"
  | "currencies_by_id"
  | "currencies_by_id_full_metadata"
  | "currencies_by_id_funding_rounds"
  | "currencies_by_id_historical"
  | "currencies_by_id_public_sales"
  | "currencies_by_id_sparkline"
  | "currencies_by_id_team"
  | "currencies_by_id_vesting"
  | "currencies_by_id_vesting_chart"
  | "exchanges_list"
  | "exchanges_map"
  | "exchanges_by_id"
  | "exchanges_by_id_full_metadata"
  | "funds_list"
  | "funds_map"
  | "funds_by_id"
  | "funds_by_id_full_metadata"
  | "funds_by_id_team"
  | "global_list"
  | "markets_list"
  | "drophunting_activities"
  | "drophunting_activities_all_tasks"
  | "drophunting_activities_by_id"
  | "drophunting_activities_by_id_all_tasks"
  | "ecosystems_map"
  | "ecosystems_tags"
  | "ecosystems_by_id"
  | "ecosystems_by_id_projects"
  | "launchpads_list"
  | "launchpads_map"
  | "launchpads_by_id"
  | "launchpads_by_id_full_metadata"
  | "news_map"
  | "news_feed"
  | "token_platforms_map";

export type CryptorankParameterSchema = {
  type?: string;
  enum?: UntypedJson[];
  items?: CryptorankParameterSchema;
  format?: string;
  default?: UntypedJson;
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
};

export type CryptorankQueryParameter = {
  name: string;
  required?: boolean;
  schema: CryptorankParameterSchema;
  description?: string;
  allowEmptyValue?: boolean;
};

export type CryptorankEndpointDefinition = {
  id: CryptorankEndpointId;
  method?: string;
  tag: string;
  summary: string;
  description?: string;
  path: string;
  credits?: number | null;
  query: CryptorankQueryParameter[];
  pathParams: Omit<CryptorankQueryParameter, "allowEmptyValue">[];
};

export type CryptorankEndpointMap = Record<CryptorankEndpointId, CryptorankEndpointDefinition>;

import idsJson from "./data/ids.json" assert { type: "json" };
import metaJson from "./data/meta.json" assert { type: "json" };

const pageLoaders: Array<() => Promise<{ default: Record<string, UntypedJson> }>> = [
  () => import("./data/pages/page-1.json"),
  () => import("./data/pages/page-2.json"),
  () => import("./data/pages/page-3.json"),
  () => import("./data/pages/page-4.json"),
  () => import("./data/pages/page-5.json"),
];

let endpointCache: CryptorankEndpointMap | null = null;

async function loadEndpoints(): Promise<CryptorankEndpointMap> {
  if (endpointCache) return endpointCache;
  const pages = await Promise.all(pageLoaders.map((loader) => loader().then((m) => m.default)));
  endpointCache = Object.assign({}, ...pages) as CryptorankEndpointMap;
  return endpointCache;
}

export async function getCryptorankEndpoints(): Promise<CryptorankEndpointMap> {
  return loadEndpoints();
}

export async function getEndpointDefinition(id: CryptorankEndpointId): Promise<CryptorankEndpointDefinition> {
  const endpoints = await loadEndpoints();
  const def = endpoints[id];
  if (!def) {
    throw new Error(`Unknown CryptoRank endpoint: ${id}`);
  }
  return def;
}

export async function getCryptorankEndpointList(): Promise<CryptorankEndpointDefinition[]> {
  const endpoints = await loadEndpoints();
  return Object.values(endpoints);
}

export const CRYPTORANK_ENDPOINT_IDS = idsJson as CryptorankEndpointId[];
export const CRYPTORANK_META = metaJson as { total: number; pageSize: number; pages: number };
