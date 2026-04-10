import "server-only";

import { z } from "zod";

import { redis, isRedisConfigured } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { getCoinPricesByIds } from "@/server/market/coingecko";

export type StellarNetwork = "public" | "testnet";

export type StellarTokenRecord = {
  assetType: "native" | "other";
  code: string;
  issuer: string | null;
  decimals: number;
  balance: string;
  priceUsd: number | null;
  priceChange24h: number | null;
  valueUsd: number | null;
};

export type StellarPaymentRecord = {
  id: string;
  pagingToken: string | null;
  createdAt: string;
  type: string | null;
  from: string | null;
  to: string | null;
  amount: string | null;
  assetType: "native" | "other";
  assetCode: string | null;
  assetIssuer: string | null;
  transactionHash: string | null;
};

export type StellarSummary = {
  tokens: StellarTokenRecord[];
  txs: StellarPaymentRecord[];
  fetchedAt: string;
};

export type FetchStellarWalletSummaryOptions = {
  includeTokens?: boolean;
  includeTransactions?: boolean;
  limit?: number;
  network?: StellarNetwork;
  cursor?: string | null;
  order?: "asc" | "desc";
  skipCache?: boolean;
  fetchTimeoutMs?: number;
};

const DEFAULT_FETCH_TIMEOUT_MS = Number(process.env.WALLET_FETCH_TIMEOUT_MS ?? 5000);
const STELLAR_CACHE_TTL_SECONDS = Number(process.env.STELLAR_WALLET_CACHE_TTL ?? 120);

const HorizonBalanceSchema = z
  .object({
    balance: z.string(),
    asset_type: z.string(),
    asset_code: z.string().optional(),
    asset_issuer: z.string().optional(),
  })
  .passthrough();

const HorizonAccountSchema = z
  .object({
    account_id: z.string(),
    balances: z.array(HorizonBalanceSchema).default([]),
  })
  .passthrough();

const HorizonPaymentRecordSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((value) => String(value)),
    paging_token: z.string().optional(),
    created_at: z.string().optional(),
    type: z.string().optional(),
    transaction_hash: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    amount: z.string().optional(),
    asset_type: z.string().optional(),
    asset_code: z.string().optional(),
    asset_issuer: z.string().optional(),
    // create_account
    funder: z.string().optional(),
    account: z.string().optional(),
    starting_balance: z.string().optional(),
    // account_merge
    into: z.string().optional(),
  })
  .passthrough();

const HorizonPaymentsEnvelopeSchema = z
  .object({
    _embedded: z
      .object({
        records: z.array(HorizonPaymentRecordSchema).default([]),
      })
      .optional(),
  })
  .passthrough();

function resolveHorizonBaseUrl(network: StellarNetwork): string {
  return network === "testnet" ? "https://horizon-testnet.stellar.org" : "https://horizon.stellar.org";
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const abortReason = new DOMException(`Stellar Horizon request timed out after ${timeoutMs}ms`, "AbortError");
  const timeout = setTimeout(() => controller.abort(abortReason), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const error = new Error(`Horizon ${res.status} ${res.statusText}: ${text || "request_failed"}`);
      (error as Error & { status?: number }).status = res.status;
      throw error;
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function toFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchNexStellarWalletSummary(
  accountId: string,
  options: FetchStellarWalletSummaryOptions = {},
): Promise<StellarSummary> {
  const address = (accountId ?? "").trim();
  if (!address || address.length < 10) {
    return { tokens: [], txs: [], fetchedAt: new Date().toISOString() };
  }

  const includeTokens = options.includeTokens ?? true;
  const includeTransactions = options.includeTransactions ?? false;
  const network: StellarNetwork = options.network ?? "public";
  const skipCache = options.skipCache ?? false;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  // Horizon supports up to 200 results per page.
  const limit = Math.min(200, Math.max(10, Number(options.limit ?? 50) || 50));
  const cursor = typeof options.cursor === "string" && options.cursor.trim().length > 0 ? options.cursor.trim() : null;
  const order: "asc" | "desc" = options.order === "asc" ? "asc" : "desc";

  // Cache keys must include option toggles to avoid returning incomplete summaries (e.g. txs omitted).
  const cacheKey = `nex:stellar:summary:v2:${network}:${address}:${includeTokens ? 1 : 0}:${includeTransactions ? 1 : 0}:${limit}:${order}:${cursor ?? ""}`;

  if (!skipCache && isRedisConfigured) {
    try {
      const cached = await redis.get<StellarSummary>(cacheKey);
      if (cached) {
        metrics.cacheHit("nex_stellar_summary");
        return cached;
      }
    } catch {
      // Ignore cache errors.
    }
  }
  metrics.cacheMiss("nex_stellar_summary");

  const baseUrl = resolveHorizonBaseUrl(network);
  const emptyPrices: Record<string, { usd?: number; usd_24h_change?: number }> = {};

  const [accountPayload, paymentsPayload, pricesById] = await Promise.all([
    includeTokens
      ? timeVendor("stellar_horizon_account", async () => {
          try {
            const raw = await fetchJsonWithTimeout<unknown>(`${baseUrl}/accounts/${encodeURIComponent(address)}`, fetchTimeoutMs);
            return HorizonAccountSchema.parse(raw);
          } catch (error) {
            const status = (error as Error & { status?: number }).status;
            if (status === 404) {
              return null;
            }
            throw error;
          }
        })
      : Promise.resolve(null),
    includeTransactions
      ? timeVendor("stellar_horizon_payments", async () => {
          try {
            const paymentsUrl = new URL(`${baseUrl}/accounts/${encodeURIComponent(address)}/payments`);
            paymentsUrl.searchParams.set("order", order);
            paymentsUrl.searchParams.set("limit", String(limit));
            if (cursor) {
              paymentsUrl.searchParams.set("cursor", cursor);
            }
            const raw = await fetchJsonWithTimeout<unknown>(paymentsUrl.toString(), fetchTimeoutMs);
            return HorizonPaymentsEnvelopeSchema.parse(raw);
          } catch (error) {
            const status = (error as Error & { status?: number }).status;
            if (status === 404) {
              return null;
            }
            throw error;
          }
        })
      : Promise.resolve(null),
    includeTokens
      ? getCoinPricesByIds(["stellar", "stellar-lumens"]).catch(() => emptyPrices)
      : Promise.resolve(emptyPrices),
  ]);

  const xlmPrice = pricesById["stellar"]?.usd ?? pricesById["stellar-lumens"]?.usd ?? null;
  const xlmChange = pricesById["stellar"]?.usd_24h_change ?? pricesById["stellar-lumens"]?.usd_24h_change ?? null;

  const tokens: StellarTokenRecord[] = [];
  const balances = accountPayload?.balances ?? [];

  for (const balance of balances) {
    const rawBalance = balance.balance;
    const assetTypeRaw = balance.asset_type;
    const isNative = assetTypeRaw === "native";
    const code = isNative ? "XLM" : (balance.asset_code ?? "").trim();
    const issuer = isNative ? null : (balance.asset_issuer ?? "").trim() || null;
    if (!code) {
      continue;
    }

    const numericBalance = toFiniteNumber(rawBalance);
    const priceUsd = isNative ? xlmPrice : null;
    const valueUsd =
      isNative && priceUsd != null && numericBalance != null ? numericBalance * priceUsd : null;

    tokens.push({
      assetType: isNative ? "native" : "other",
      code,
      issuer,
      decimals: 7,
      balance: rawBalance,
      priceUsd,
      priceChange24h: isNative ? xlmChange : null,
      valueUsd,
    });
  }

  const txs: StellarPaymentRecord[] = [];
  const rawRecords = paymentsPayload?._embedded?.records ?? [];
  for (const record of rawRecords) {
    const createdAt = typeof record.created_at === "string" ? record.created_at : new Date().toISOString();
    const type = typeof record.type === "string" ? record.type : null;
    const pagingToken = typeof record.paging_token === "string" ? record.paging_token : null;

    const directFrom = typeof record.from === "string" ? record.from : null;
    const directTo = typeof record.to === "string" ? record.to : null;
    const txHash = typeof record.transaction_hash === "string" ? record.transaction_hash : null;

    let from: string | null = directFrom;
    let to: string | null = directTo;
    let amount: string | null = typeof record.amount === "string" ? record.amount : null;
    let assetType: "native" | "other" = record.asset_type === "native" ? "native" : "other";
    let assetCode: string | null = typeof record.asset_code === "string" ? record.asset_code : null;
    let assetIssuer: string | null = typeof record.asset_issuer === "string" ? record.asset_issuer : null;

    if (type === "create_account") {
      from = typeof record.funder === "string" ? record.funder : from;
      to = typeof record.account === "string" ? record.account : to;
      amount = typeof record.starting_balance === "string" ? record.starting_balance : amount;
      assetType = "native";
      assetCode = "XLM";
      assetIssuer = null;
    }

    if (type === "account_merge") {
      from = typeof record.account === "string" ? record.account : from;
      to = typeof record.into === "string" ? record.into : to;
      // account_merge does not include an explicit amount; leave as null.
      assetType = "native";
      assetCode = "XLM";
      assetIssuer = null;
    }

    if (assetType === "native") {
      assetCode = "XLM";
      assetIssuer = null;
    }

    txs.push({
      id: record.id,
      pagingToken,
      createdAt,
      type,
      from,
      to,
      amount,
      assetType,
      assetCode,
      assetIssuer,
      transactionHash: txHash,
    });
  }

  const summary: StellarSummary = {
    tokens,
    txs,
    fetchedAt: new Date().toISOString(),
  };

  if (!skipCache && isRedisConfigured) {
    redis.set(cacheKey, summary, { ex: STELLAR_CACHE_TTL_SECONDS }).catch(() => {});
  }

  return summary;
}
