import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { fetchMemecoinCandidates, enrichMemecoinRows } from "@/server/market/solana/memecoin-discovery";
import { memecoinAutotradeParamsSchema, scoreMemecoin } from "@/server/market/solana/memecoin-scoring";
import { resolveSolanaAutotradeSigner } from "@/server/services/solana/autotrader-signer";
import { buyTokens } from "@/modules/wallets/pumpfun/service";
import { PublicKey } from "@solana/web3.js";
import { normalizeSolanaAddress } from "@/server/moralis/validation";

import { logger } from "@/lib/logger";

const WORKER_AUTH_HEADER = "x-cron-key";


const strategyRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  parameters: z.unknown(),
  metadata: z.unknown().nullable(),
});

type StrategyRow = z.infer<typeof strategyRowSchema>;

type StrategyMetadata = {
  lastRunAt?: string;
  dayWindowStart?: string;
  tradesToday?: number;
  solSpentToday?: number;
  lastTradeByMint?: Record<string, { at: string; signature?: string | null; sol?: number | null }>;
  pendingTradeByMint?: Record<string, { at: string }>;
  lastRecommendation?: {
    mint: string;
    score: number;
    reasons: string[];
    at: string;
  } | null;
};

function parseMetadata(raw: unknown): StrategyMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as StrategyMetadata;
}

function startOfUtcDayIso(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  return x.toISOString();
}

function minutesSince(iso: string): number | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return (Date.now() - ms) / 60000;
}

function withinCooldown(metadata: StrategyMetadata, mint: string, cooldownMinutes: number): boolean {
  if (cooldownMinutes <= 0) return false;
  const record = metadata.lastTradeByMint?.[mint];
  if (!record?.at) return false;
  const mins = minutesSince(record.at);
  return mins != null && mins >= 0 && mins < cooldownMinutes;
}

function hasPendingTrade(metadata: StrategyMetadata, mint: string, pendingMinutes: number): boolean {
  if (pendingMinutes <= 0) return false;
  const record = metadata.pendingTradeByMint?.[mint];
  if (!record?.at) return false;
  const mins = minutesSince(record.at);
  return mins != null && mins >= 0 && mins < pendingMinutes;
}

async function updateStrategyMetadata(strategyId: string, patch: StrategyMetadata) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("automation_strategies")
    .update({ metadata: patch as unknown as Record<string, unknown>, updated_at: now })
    .eq("id", strategyId);
  if (error) {
    throw new Error(`failed_to_update_strategy_metadata:${error.message}`);
  }
}

async function loadActiveStrategies(): Promise<StrategyRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("automation_strategies")
    .select("id,user_id,parameters,metadata")
    .eq("is_active", true)
    .filter("parameters->>kind", "eq", "solana_memecoin_autotrade");

  if (error) {
    throw new Error(`failed_to_load_strategies:${error.message}`);
  }
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => {
      const parsed = strategyRowSchema.safeParse(row);
      return parsed.success ? parsed.data : null;
    })
    .filter((v): v is StrategyRow => Boolean(v));
}

async function loadUserSessionScopes(userId: string): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_agent_keys")
    .select("scopes,revoked_at,expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`failed_to_load_user_session_keys:${error.message}`);
  }
  const scopes = new Set<string>();
  for (const row of (data ?? []) as Array<Record<string, UntypedJson>>) {
    const expiresAt = typeof row.expires_at === "string" ? Date.parse(row.expires_at) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) continue;
    const rawScopes = row.scopes;
    if (Array.isArray(rawScopes)) {
      for (const s of rawScopes) {
        if (typeof s === "string" && s.trim()) scopes.add(s.trim());
      }
    }
  }
  return scopes;
}

async function executeStrategy(strategy: StrategyRow) {
  const parsedParams = memecoinAutotradeParamsSchema.parse(strategy.parameters);
  const metadata = parseMetadata(strategy.metadata);

  const now = new Date();
  const dayStart = startOfUtcDayIso(now);
  const sameDay = metadata.dayWindowStart === dayStart;
  const windowStart = dayStart;
  const tradesToday = sameDay ? (metadata.tradesToday ?? 0) : 0;
  const solSpentToday = sameDay ? (metadata.solSpentToday ?? 0) : 0;

  const universe = parsedParams.universe;
  const cluster = parsedParams.cluster;
  const candidates = await fetchMemecoinCandidates({
    universe,
    cluster,
    limit: parsedParams.candidateLimit,
  });
  const enriched = await enrichMemecoinRows({
    cluster,
    candidates: candidates.slice(0, parsedParams.enrichTopN),
    concurrency: 6,
    kolWallets: parsedParams.kolWallets,
    kolLookbackMinutes: parsedParams.kolLookbackMinutes,
    heliusSignatureLimit: parsedParams.heliusSignatureLimit,
    heliusTxDetailLimit: parsedParams.heliusTxDetailLimit,
  });

  const scored = enriched
    .map((row) => ({ row, result: scoreMemecoin(row, parsedParams) }))
    .filter(({ result }) => result.hardRejectReasons.length === 0)
    .sort((a, b) => b.result.score - a.result.score);

  const best = scored[0];
  if (!best) {
    await updateStrategyMetadata(strategy.id, {
      ...metadata,
      dayWindowStart: windowStart,
      tradesToday,
      solSpentToday,
      lastRunAt: now.toISOString(),
      lastRecommendation: null,
    });
    return { status: "no_candidates" as const };
  }

  const bestMint = best.row.candidate.mint;
  const bestScore = best.result.score;

  const nextMetadata: StrategyMetadata = {
    ...metadata,
    dayWindowStart: windowStart,
    tradesToday,
    solSpentToday,
    lastRunAt: now.toISOString(),
    lastRecommendation: {
      mint: bestMint,
      score: bestScore,
      reasons: best.result.reasons.slice(0, 8),
      at: now.toISOString(),
    },
  };

  // Always persist recommendation so UI can show "what the bot would do".
  await updateStrategyMetadata(strategy.id, nextMetadata);

  if (bestScore < parsedParams.minScoreToTrade) {
    return { status: "score_below_threshold" as const, mint: bestMint, score: bestScore };
  }

  const execution = parsedParams.execution;
  if (execution.mode === "propose") {
    return { status: "proposed" as const, mint: bestMint, score: bestScore };
  }

  // Execution mode: enforce user scopes + budgets + cooldown.
  const scopes = await loadUserSessionScopes(strategy.user_id);
  if (!scopes.has("buy")) {
    return { status: "blocked_missing_scope" as const, scope: "buy" };
  }

  if (execution.maxTradesPerDay > 0 && tradesToday >= execution.maxTradesPerDay) {
    return { status: "blocked_trade_limit" as const };
  }
  if (execution.maxSolPerDay > 0 && solSpentToday + execution.buyAmountSol > execution.maxSolPerDay) {
    return { status: "blocked_spend_limit" as const };
  }

  const normalizedMint = normalizeSolanaAddress(bestMint);
  if (withinCooldown(nextMetadata, normalizedMint, execution.cooldownMinutesPerMint)) {
    return { status: "blocked_cooldown" as const };
  }

  // Best-effort idempotency guard: if a previous run set a pending marker, don't re-trade immediately.
  // This reduces duplicate buys if the worker is retried after the trade was broadcast but before metadata update.
  if (hasPendingTrade(nextMetadata, normalizedMint, 10)) {
    return { status: "blocked_pending_trade" as const };
  }

  const signerResolution = await resolveSolanaAutotradeSigner({
    userId: strategy.user_id,
    cluster,
    signingMode: execution.signingMode,
    walletAddress: execution.walletAddress,
    chainId: execution.chainId,
  });
  if (!signerResolution.ok) {
    return {
      status: "blocked_missing_signer" as const,
      reason: signerResolution.reason,
      detail: signerResolution.detail ?? null,
    };
  }

  const lamports = BigInt(Math.round(execution.buyAmountSol * 1e9));
  if (lamports <= 0n) {
    throw new Error("invalid_buy_amount_sol");
  }

  const pendingTradeByMint = {
    ...(nextMetadata.pendingTradeByMint ?? {}),
    [normalizedMint]: { at: now.toISOString() },
  };

  await updateStrategyMetadata(strategy.id, {
    ...nextMetadata,
    pendingTradeByMint,
  });

  const trade = await buyTokens({
    cluster,
    buyer: signerResolution.signer.signer,
    mint: new PublicKey(normalizedMint),
    buyAmountLamports: lamports,
    slippageBasisPoints: BigInt(execution.slippageBps),
    priorityFees: null,
  }).catch((error) => {
    // Clear the pending marker on thrown errors so the strategy isn't stuck.
    updateStrategyMetadata(strategy.id, {
      ...nextMetadata,
      pendingTradeByMint: Object.fromEntries(Object.entries(pendingTradeByMint).filter(([k]) => k !== normalizedMint)),
    }).catch(() => {});
    throw error;
  });

  const signature = trade.signature ?? null;
  const ok = trade.success === true;
  const updatedTradesToday = tradesToday + (ok ? 1 : 0);
  const updatedSolSpentToday = solSpentToday + (ok ? execution.buyAmountSol : 0);
  const lastTradeByMint = {
    ...(nextMetadata.lastTradeByMint ?? {}),
    [normalizedMint]: { at: now.toISOString(), signature, sol: execution.buyAmountSol },
  };

  await updateStrategyMetadata(strategy.id, {
    ...nextMetadata,
    tradesToday: updatedTradesToday,
    solSpentToday: updatedSolSpentToday,
    pendingTradeByMint: Object.fromEntries(
      Object.entries(pendingTradeByMint).filter(([k]) => k !== normalizedMint),
    ),
    lastTradeByMint,
  });

  if (!ok) {
    return { status: "trade_failed" as const, mint: normalizedMint, signature, error: trade.error ? String(trade.error) : null };
  }

  return { status: "traded" as const, mint: normalizedMint, signature };
}

async function handle(request: Request) {
  const workerKey = process.env.NEX_TASK_DISPATCH_KEY;
  if (!workerKey) {
    logger.error("[automation][solana-memecoin] NEX_TASK_DISPATCH_KEY is not set");
    return apiResponse.serviceUnavailable("service_misconfigured");
  }
  const provided = request.headers.get(WORKER_AUTH_HEADER);
  if (!provided || provided !== workerKey) {
    return apiResponse.unauthorized("unauthorized");
  }

  const strategies = await loadActiveStrategies();
  const results: Array<Record<string, UntypedJson>> = [];

  for (const strategy of strategies) {
    try {
      const res = await executeStrategy(strategy);
      results.push({ strategyId: strategy.id, userId: strategy.user_id, ...res });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("[automation][solana-memecoin] strategy execution failed", { strategyId: strategy.id, message });
      results.push({ strategyId: strategy.id, userId: strategy.user_id, status: "error", error: message });
    }
  }

  return apiResponse.success({ ok: true, processed: strategies.length, results });
}

export async function POST(request: Request) {
  return timeApiRoute("workers.automation.solana_memecoin.POST", async () => handle(request));
}

export async function GET(request: Request) {
  return timeApiRoute("workers.automation.solana_memecoin.GET", async () => handle(request));
}
