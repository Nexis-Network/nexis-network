import { randomUUID } from "crypto";

import pMap from "p-map";
import { connection, NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { redis } from "@/server/services/redis";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { fetchNexStellarWalletSummary, type StellarNetwork, type StellarPaymentRecord } from "@/server/services/nex";
import { insertWalletTransactions } from "@/server/wallet-analytics/repository";
import type { WalletTransactionInsert, WalletAssetType } from "@/server/wallet-analytics/types";

export const maxDuration = 60;

type WalletAccountRow = {
  id: string;
  user_id: string;
  address: string | null;
  metadata: Record<string, UntypedJson> | null;
};

const LOCK_KEY = "cron:wallet-analytics:stellar:lock:v1";
const LOCK_TTL_SECONDS = 75;
const DEFAULT_FETCH_TIMEOUT_MS = 3_500;

function parsePositiveInt(value: string | null, fallback: number, { min, max }: { min: number; max: number }) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveNetwork(metadata: Record<string, UntypedJson> | null): StellarNetwork {
  const env = typeof metadata?.crossmintEnv === "string" ? metadata.crossmintEnv.toLowerCase() : "";
  if (env === "staging") return "testnet";

  const network = typeof metadata?.network === "string" ? metadata.network.toLowerCase() : "";
  if (network.includes("testnet")) return "testnet";
  return "public";
}

function parseCursor(metadata: Record<string, UntypedJson> | null): string | null {
  const cursor = typeof metadata?.stellarPaymentsCursor === "string" ? metadata.stellarPaymentsCursor.trim() : "";
  return cursor.length > 0 ? cursor : null;
}

function pickMaxPagingToken(records: StellarPaymentRecord[]): string | null {
  let best: bigint | null = null;
  let bestStr: string | null = null;

  for (const record of records) {
    const token = typeof record.pagingToken === "string" ? record.pagingToken.trim() : "";
    if (!token) continue;
    try {
      const value = BigInt(token);
      if (best === null || value > best) {
        best = value;
        bestStr = token;
      }
    } catch {
      // Ignore non-numeric paging tokens.
    }
  }

  return bestStr;
}

function toUpper(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function mapPaymentsToTransactions(params: {
  accountId: string;
  walletAddress: string;
  network: StellarNetwork;
  payments: StellarPaymentRecord[];
}): WalletTransactionInsert[] {
  const walletKey = toUpper(params.walletAddress);

  return params.payments.map((payment) => {
    const from = typeof payment.from === "string" ? payment.from : null;
    const to = typeof payment.to === "string" ? payment.to : null;
    const fromKey = toUpper(from);
    const toKey = toUpper(to);

    const direction: WalletTransactionInsert["direction"] =
      fromKey && fromKey === walletKey && toKey && toKey === walletKey
        ? "neutral"
        : fromKey && fromKey === walletKey
          ? "outbound"
          : toKey && toKey === walletKey
            ? "inbound"
            : "neutral";

    const counterparty = direction === "inbound" ? from : direction === "outbound" ? to : null;

    const assetType: WalletAssetType = payment.assetType === "native" ? "native" : "other";
    const contractAddress =
      assetType === "native"
        ? null
        : payment.assetIssuer && payment.assetCode
          ? `${payment.assetCode}:${payment.assetIssuer}`
          : payment.assetCode;

    return {
      accountId: params.accountId,
      chainId: null,
      hash: payment.id,
      logIndex: 0,
      direction,
      assetType,
      contractAddress: contractAddress ?? null,
      tokenId: null,
      quantity: typeof payment.amount === "string" ? payment.amount : null,
      amountUsd: null,
      feeUsd: null,
      realizedPnlUsd: null,
      counterparty,
      source: "stellar:horizon",
      metadata: {
        network: params.network,
        pagingToken: payment.pagingToken,
        type: payment.type,
        transactionHash: payment.transactionHash,
        from,
        to,
      },
      occurredAt: payment.createdAt,
    };
  });
}

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cron.wallet-analytics.stellar", async () => {
    const secret = process.env.CRON_SECRET ?? "";
    const authHeader = request.headers.get("authorization");

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const url = new URL(request.url);
    const limitAccounts = parsePositiveInt(url.searchParams.get("limitAccounts"), 50, { min: 1, max: 200 });
    const perAccountLimit = parsePositiveInt(url.searchParams.get("perAccountLimit"), 200, { min: 10, max: 200 });
    const concurrency = parsePositiveInt(url.searchParams.get("concurrency"), 5, { min: 1, max: 5 });

    const lockOwner = randomUUID();
    const acquired = await redis.trySetNx(LOCK_KEY, lockOwner, LOCK_TTL_SECONDS);
    if (!acquired) {
      return apiResponse.success({ ok: true, message: "wallet analytics ingestion already running" });
    }

    const supabase = createServiceRoleClient();
    const startedAt = new Date().toISOString();
    let errors = 0;

    try {
      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("id,user_id,address,metadata")
        .eq("platform", "stellar")
        .order("updated_at", { ascending: true })
        .limit(limitAccounts)
        .returns<WalletAccountRow[]>();

      if (error) {
        return apiResponse.internalError(`Failed to list stellar wallet accounts: ${error.message}`);
      }

      const accounts = Array.isArray(data) ? data : [];
      if (accounts.length === 0) {
        return apiResponse.success({ ok: true, processed: 0, inserted: 0, updatedCursors: 0, errors: 0, startedAt });
      }

      let processed = 0;
      let inserted = 0;
      let updatedCursors = 0;

      await pMap(
        accounts,
        async (row) => {
          processed += 1;
          const nowIso = new Date().toISOString();
          const address = typeof row.address === "string" ? row.address.trim() : "";
          if (!address) {
            return;
          }

          const metadata = isRecord(row.metadata) ? row.metadata : {};
          const network = resolveNetwork(metadata);
          const cursor = parseCursor(metadata);
          const isBootstrap = cursor === null;

          try {
            const summary = await fetchNexStellarWalletSummary(address, {
              includeTokens: false,
              includeTransactions: true,
              limit: perAccountLimit,
              network,
              cursor,
              order: isBootstrap ? "desc" : "asc",
              skipCache: true,
              fetchTimeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
            });

            if (!Array.isArray(summary.txs) || summary.txs.length === 0) {
              // Still stamp last ingestion attempt for operational visibility.
              const nextMetadata = {
                ...metadata,
                stellarPaymentsLastIngestAt: nowIso,
                stellarPaymentsNetwork: network,
              };
              const { error: updateError } = await supabase
                .from("wallet_accounts")
                .update({ metadata: nextMetadata, updated_at: nowIso })
                .eq("id", row.id);
              if (updateError) {
                errors += 1;
                logger.warn("[cron][wallet-analytics][stellar] failed to update wallet account metadata", {
                  accountId: row.id,
                  address,
                  network,
                  error: updateError,
                });
              }
              return;
            }

            const transactions = mapPaymentsToTransactions({
              accountId: row.id,
              walletAddress: address,
              network,
              payments: summary.txs,
            });

            await insertWalletTransactions(supabase, transactions);
            inserted += transactions.length;

            const nextCursor = pickMaxPagingToken(summary.txs);
            const shouldUpdateCursor = typeof nextCursor === "string" && nextCursor.length > 0 && nextCursor !== cursor;

            const nextMetadata = {
              ...metadata,
              stellarPaymentsLastIngestAt: nowIso,
              stellarPaymentsNetwork: network,
              ...(shouldUpdateCursor
                ? {
                    stellarPaymentsCursor: nextCursor,
                    stellarPaymentsCursorUpdatedAt: nowIso,
                  }
                : {}),
            };

            const { error: updateError } = await supabase
              .from("wallet_accounts")
              .update({ metadata: nextMetadata, updated_at: nowIso })
              .eq("id", row.id);
            if (updateError) {
              errors += 1;
              logger.warn("[cron][wallet-analytics][stellar] failed to update wallet account metadata", {
                accountId: row.id,
                address,
                network,
                error: updateError,
              });
            }

            if (shouldUpdateCursor) {
              updatedCursors += 1;
            }
          } catch (error) {
            errors += 1;
            logger.error("[cron][wallet-analytics][stellar] account ingest failed", {
              accountId: row.id,
              address,
              network,
              error,
            });

            const nextMetadata = {
              ...metadata,
              stellarPaymentsLastError: error instanceof Error ? error.message : String(error),
              stellarPaymentsLastErrorAt: nowIso,
            };
            const { error: updateError } = await supabase
              .from("wallet_accounts")
              .update({ metadata: nextMetadata, updated_at: nowIso })
              .eq("id", row.id);
            if (updateError) {
              logger.warn("[cron][wallet-analytics][stellar] failed to persist wallet account error metadata", {
                accountId: row.id,
                address,
                network,
                error: updateError,
              });
            }
          }
        },
        { concurrency },
      );

      return apiResponse.success({
        ok: true,
        startedAt,
        processed,
        inserted,
        updatedCursors,
        errors,
      });
    } catch (error) {
      errors += 1;
      logger.error("[cron][wallet-analytics][stellar] failed", { error });
      return apiResponse.internalError(error instanceof Error ? error.message : String(error));
    } finally {
      await redis.tryReleaseLock(LOCK_KEY, lockOwner);
    }
  });
}
