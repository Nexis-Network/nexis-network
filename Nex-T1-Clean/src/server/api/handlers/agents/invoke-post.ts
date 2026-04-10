import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import type { AgentInvokeRouteContext } from "@/server/api/contracts/agents";
import { withAgentAuth } from "@/server/api/helpers/with-agent-auth";
import { invokeAgentRequestSchema } from "@/server/api/validators/agents";
import { canManageAgent, canViewPrivateAgentConfig } from "@/server/agents/access";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { decryptSecret, type VaultCipher } from "@/server/security/wallet-vault";
import { consumeCredits } from "@/server/services/credits/credit-service";

function normalizeEndpointUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("missing_endpoint_url");
  }
  const url = new URL(trimmed);
  // Ensure we target the runtime /invoke endpoint.
  return new URL("/invoke", url).toString();
}

function resolveSessionKeyHeaderName(): string {
  return process.env.SESSION_KEY_HEADER?.trim() || "X-Session-Key";
}

const VALUE_MOVING_PATTERNS: RegExp[] = [
  /(^|_)order(_|$)/i,
  /(^|_)swap(_|$)/i,
  /(^|_)trade(_|$)/i,
  /(^|_)execute(_|$)/i,
  /(^|_)send(_|$)/i,
  /(^|_)transfer(_|$)/i,
  /(^|_)approve(_|$)/i,
  /(^|_)sign(_|$)/i,
  /(^|_)place(_|$)/i,
  /(^|_)cancel(_|$)/i,
  /(^|_)withdraw(_|$)/i,
  /(^|_)deposit(_|$)/i,
  /(^|_)bridge(_|$)/i,
];

function isValueMovingToolName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();

  // Read-only exceptions (avoid false positives for market-data tools).
  if (normalized.includes("order_book") || normalized.includes("orderbook")) return false;
  if (normalized.includes("recent_trades") || normalized.endsWith("_trades")) return false;
  if (normalized.includes("swap_quote") || normalized.includes("swap_price")) return false;
  if (normalized.endsWith("_quote") || normalized.endsWith("_price")) return false;
  if (normalized.includes("transfer_status") || normalized.includes("route_status")) return false;

  return VALUE_MOVING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function parseMcpVenue(toolName: string): string | null {
  const match = /^mcp_([a-z0-9]+)__/i.exec(toolName);
  return match?.[1]?.toLowerCase() ?? null;
}

function getNumberField(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function extractNotionalUsd(input: UntypedJson): number | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, UntypedJson>;
  const candidates = [
    record.notionalUsd,
    record.notional_usd,
    record.amountUsd,
    record.amount_usd,
    record.usd,
    record.valueUsd,
    record.value_usd,
  ];
  for (const candidate of candidates) {
    const num = getNumberField(candidate);
    if (num != null && num > 0) return num;
  }
  return null;
}

function extractTxHash(output: UntypedJson): string | null {
  if (!output || typeof output !== "object") return null;
  const record = output as Record<string, UntypedJson>;
  const candidates = [record.txHash, record.tx_hash, record.transactionHash, record.hash, record.txid];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function extractOrderId(output: UntypedJson): string | null {
  if (!output || typeof output !== "object") return null;
  const record = output as Record<string, UntypedJson>;
  const candidates = [
    record.orderUid,
    record.order_uid,
    record.orderId,
    record.order_id,
    record.uid,
    record.oid,
    record.id,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
  return null;
}

function extractPnlUsd(output: UntypedJson): number | null {
  if (!output || typeof output !== "object") return null;
  const record = output as Record<string, UntypedJson>;
  const candidates = [record.pnlUsd, record.pnl_usd, record.pnl, record.realizedPnlUsd, record.realized_pnl_usd];
  for (const candidate of candidates) {
    const num = getNumberField(candidate);
    if (num != null && Number.isFinite(num)) return num;
  }
  return null;
}

function extractFeesUsd(output: UntypedJson): number | null {
  if (!output || typeof output !== "object") return null;
  const record = output as Record<string, UntypedJson>;
  const candidates = [record.feesUsd, record.fees_usd, record.feeUsd, record.fee_usd];
  for (const candidate of candidates) {
    const num = getNumberField(candidate);
    if (num != null && num >= 0) return num;
  }
  return null;
}

function extractAmount(input: UntypedJson): string | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, UntypedJson>;
  const candidates = [record.amount, record.qty, record.quantity, record.size, record.value];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const value = String(candidate);
    if (value.trim()) return value;
  }
  return null;
}

function extractJsonField(value: UntypedJson, keys: string[]): UntypedJson | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, UntypedJson>;
  for (const key of keys) {
    if (record[key] != null) return record[key];
  }
  return null;
}

function extractBalancePre(output: UntypedJson): UntypedJson | null {
  return extractJsonField(output, ["balance_pre", "balancePre", "preBalance", "beforeBalance", "balancesBefore", "before"]);
}

function extractBalancePost(output: UntypedJson): UntypedJson | null {
  return extractJsonField(output, ["balance_post", "balancePost", "postBalance", "afterBalance", "balancesAfter", "after"]);
}

function extractFeesBreakdown(output: UntypedJson): UntypedJson | null {
  return extractJsonField(output, ["fees_breakdown", "feesBreakdown", "feeBreakdown", "fees"]);
}

function extractWalletAddress(value: UntypedJson): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, UntypedJson>;
  const candidates = [
    record.walletAddress,
    record.wallet_address,
    record.safeAddress,
    record.safe_address,
    record.account,
    record.address,
    record.from,
    record.sender,
    record.taker,
    record.owner,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return trimmed;
    // Allow non-EVM addresses (e.g. Hyperliquid account or Solana) as a best-effort string.
    if (trimmed.length >= 20) return trimmed;
  }
  return null;
}

function extractChainId(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const caipMatch = /^eip155:(\d+)$/.exec(trimmed);
    if (caipMatch) return Number(caipMatch[1]);
    const num = Number(trimmed);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function extractChainIdFromInput(input: UntypedJson): number | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, UntypedJson>;
  return (
    extractChainId(record.chainId) ??
    extractChainId(record.chain_id) ??
    extractChainId(record.networkId) ??
    extractChainId(record.network_id) ??
    null
  );
}

function inferSide(value: UntypedJson): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, UntypedJson>;
  const raw = record.side ?? record.action ?? record.direction ?? null;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  const allowed = new Set(["buy", "sell", "short", "cover", "liquidate", "rebalance"]);
  return allowed.has(normalized) ? normalized : null;
}

function inferAssetPair(input: UntypedJson): { base_asset?: string | null; quote_asset?: string | null } {
  if (!input || typeof input !== "object") return { base_asset: null, quote_asset: null };
  const record = input as Record<string, UntypedJson>;
  const base =
    (typeof record.base_asset === "string" ? record.base_asset : null) ??
    (typeof record.baseAsset === "string" ? record.baseAsset : null) ??
    (typeof record.base === "string" ? record.base : null) ??
    (typeof record.tokenIn === "string" ? record.tokenIn : null) ??
    null;
  const quote =
    (typeof record.quote_asset === "string" ? record.quote_asset : null) ??
    (typeof record.quoteAsset === "string" ? record.quoteAsset : null) ??
    (typeof record.quote === "string" ? record.quote : null) ??
    (typeof record.tokenOut === "string" ? record.tokenOut : null) ??
    null;
  return { base_asset: base, quote_asset: quote };
}

type ActiveRental = {
  id: string;
  listingId: string;
  listingType: "rent" | "usage";
  startTs: string | null;
  endTs: string | null;
  terms: Record<string, UntypedJson> | null;
};

type AgentVersionModelConfig = {
  id?: UntypedJson;
  temperature?: UntypedJson;
  maxTokens?: UntypedJson;
};

type RuntimeInvokeToolCall = {
  toolName?: UntypedJson;
  toolCallId?: UntypedJson;
  input?: UntypedJson;
};

type RuntimeInvokeToolResult = {
  toolCallId?: UntypedJson;
  output?: UntypedJson;
};

type RuntimeInvokeResult = {
  toolCalls?: UntypedJson;
  toolResults?: UntypedJson;
};

type RuntimeInvokeResponse = {
  ok?: UntypedJson;
  result?: RuntimeInvokeResult;
  error?: UntypedJson;
};

type AgentListingPriceRow = {
  price_base_units?: UntypedJson;
  network_id?: string | null;
  asset_id?: string | null;
};

function getTermString(terms: Record<string, UntypedJson> | null | undefined, keys: string[]): string | null {
  if (!terms) return null;
  for (const key of keys) {
    const value = terms[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeAssetId(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "native") return null;
  return trimmed;
}

export async function agentsInvokePostHandler(req: NextRequest, ctx: AgentInvokeRouteContext) {
  try {
    const { id: agentId } = await ctx.params;
    const raw = await req.json().catch(() => ({}));
    const input = invokeAgentRequestSchema.parse(raw);

    const auth = await withAgentAuth({ req, agentId });
    if (!auth.ok) return auth.response;

    const canViewPrivateConfig = canViewPrivateAgentConfig({
      userId: auth.userId,
      membershipRole: auth.membershipRole,
      agentOwnerUserId: auth.agentOwnerUserId,
    });

    let activeRental: ActiveRental | null = null;
    if (auth.agentVisibility === "private" && !canViewPrivateConfig) {
      const { data: rentals, error: rentalsError } = await auth.supabase
        .from("agent_rental")
        .select("id, listing_id, state, start_ts, end_ts, terms")
        .eq("org_id", auth.orgId)
        .eq("renter_user_id", auth.userId)
        .eq("state", "active")
        .order("start_ts", { ascending: false })
        .limit(20);

      if (rentalsError) {
        return createErrorResponse(new Error(rentalsError.message), { status: 400, customMessage: "Unable to load rentals" });
      }

      const rentalRows = (rentals ?? []) as Array<{
        id: string;
        listing_id: string | null;
        state: string;
        start_ts: string | null;
        end_ts: string | null;
        terms: Record<string, UntypedJson> | null;
      }>;

      const listingIds = Array.from(new Set(rentalRows.map((row) => row.listing_id).filter((id): id is string => Boolean(id))));
      if (listingIds.length > 0) {
        const { data: listings, error: listingsError } = await auth.supabase
          .from("agent_listing")
          .select("id, listing_type, active")
          .eq("org_id", auth.orgId)
          .eq("agent_id", agentId)
          .eq("active", true)
          .in("id", listingIds);

        if (listingsError) {
          return createErrorResponse(new Error(listingsError.message), { status: 400, customMessage: "Unable to load listing info" });
        }

        const listingTypeById = new Map<string, string>();
        for (const listing of listings ?? []) {
          const row = listing as { id: string; listing_type: string; active: boolean };
          listingTypeById.set(row.id, row.listing_type);
        }

        const now = Date.now();
        for (const rental of rentalRows) {
          if (!rental.listing_id) continue;
          const listingType = listingTypeById.get(rental.listing_id);
          if (listingType !== "rent" && listingType !== "usage") continue;
          if (rental.end_ts) {
            const end = Date.parse(rental.end_ts);
            if (Number.isFinite(end) && end <= now) continue;
          }
          activeRental = {
            id: rental.id,
            listingId: rental.listing_id,
            listingType,
            startTs: rental.start_ts,
            endTs: rental.end_ts,
            terms: rental.terms ?? null,
          };
          break;
        }
      }

      if (!activeRental) {
        return createErrorResponse(new Error("Forbidden"), { status: 403, customMessage: "Active rental required to invoke this private agent." });
      }
    }

    // Value-moving calls must be restricted to managers/admins/owners.
    if (input.toolMode === "trading" && !canManageAgent(auth.membershipRole)) {
      return createErrorResponse(new Error("Forbidden"), { status: 403 });
    }

    const supabase = auth.supabase;

    const deploymentQuery = supabase
      .from("agent_deployment")
      .select("id,version_id,endpoint_url,status,created_at")
      .eq("org_id", auth.orgId)
      .eq("agent_id", agentId);

    const { data: deploymentRow, error: deploymentError } = input.deploymentId
      ? await deploymentQuery.eq("id", input.deploymentId).maybeSingle()
      : await deploymentQuery.eq("status", "running").order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (deploymentError) {
      return createErrorResponse(new Error(deploymentError.message), {
        status: 400,
        customMessage: "Unable to load agent deployment",
      });
    }
    if (!deploymentRow) {
      return createErrorResponse(new Error("No running deployment"), {
        status: 404,
        customMessage: "No running deployment found for agent",
      });
    }
    if (deploymentRow.status !== "running") {
      return createErrorResponse(new Error("Deployment not running"), {
        status: 400,
        customMessage: "Deployment must be running to invoke",
      });
    }
    if (!deploymentRow.endpoint_url) {
      return createErrorResponse(new Error("Missing endpoint_url"), {
        status: 400,
        customMessage: "Deployment is missing runtime endpoint URL",
      });
    }

    const endpointUrl = normalizeEndpointUrl(String(deploymentRow.endpoint_url));

    // Load agent + version config for runtime (avoid broad selects).
    const [{ data: agentRow, error: agentError }, { data: versionRow, error: versionError }] = await Promise.all([
      supabase
        .from("agent")
        .select("id,org_id,system_prompt")
        .eq("id", agentId)
        .eq("org_id", auth.orgId)
        .maybeSingle(),
      supabase
        .from("agent_version")
        .select("id,org_id,agent_id,config")
        .eq("id", deploymentRow.version_id)
        .eq("agent_id", agentId)
        .eq("org_id", auth.orgId)
        .maybeSingle(),
    ]);

    if (agentError) {
      return createErrorResponse(new Error(agentError.message), { status: 400, customMessage: "Unable to load agent" });
    }
    if (!agentRow) {
      return createErrorResponse(new Error("Agent not found"), { status: 404, customMessage: "Agent not found" });
    }

    if (versionError) {
      return createErrorResponse(new Error(versionError.message), {
        status: 400,
        customMessage: "Unable to load agent version",
      });
    }
    if (!versionRow) {
      return createErrorResponse(new Error("Version not found"), {
        status: 404,
        customMessage: "Agent version not found",
      });
    }

    const config = (versionRow as { config?: UntypedJson }).config;
    const configRecord = config && typeof config === "object" ? (config as { model?: UntypedJson }) : null;
    const configModelRaw = configRecord?.model;
    const configModel =
      configModelRaw && typeof configModelRaw === "object"
        ? (configModelRaw as AgentVersionModelConfig)
        : null;

    const modelId = typeof configModel?.id === "string" && configModel.id.trim() ? configModel.id.trim() : "openai/gpt-5-mini";
    const temperature = typeof configModel?.temperature === "number" ? configModel.temperature : undefined;
    const maxOutputTokens = typeof configModel?.maxTokens === "number" ? configModel.maxTokens : undefined;

    // Enforce credit limit for standard invocations (toolMode="readonly" or "trading" both consume credits for now).
    // Future: we might differentiate "premium" vs "standard" usage.
    const { ok: creditOk } = await consumeCredits(auth.userId, 1);
    
    if (!creditOk) {
      return createErrorResponse(new Error("Insufficient credits"), {
        status: 402, // Payment Required
        customMessage: "You have run out of daily credits. Please upgrade your plan or wait for the daily reset.",
      });
    }

    // Resolve per-deployment session key (stored as service-role-only secret).
    const service = createServiceRoleClient();
    const { data: sessionSecretRow, error: sessionSecretError } = await service
      .from("agent_secret_version")
      .select("envelope")
      .eq("org_id", auth.orgId)
      .eq("agent_id", agentId)
      .eq("agent_version_id", deploymentRow.version_id)
      .eq("key_name", `tee_session_key:${deploymentRow.id}`)
      .maybeSingle();

    if (sessionSecretError) {
      return createErrorResponse(new Error(sessionSecretError.message), {
        status: 500,
        customMessage: "Unable to load runtime session secret",
      });
    }
    if (!sessionSecretRow?.envelope) {
      return createErrorResponse(new Error("Missing runtime session secret"), {
        status: 500,
        customMessage: "Missing runtime session secret for deployment",
      });
    }

    const sessionKeyB64 = decryptSecret(sessionSecretRow.envelope as VaultCipher).trim();
    const headerName = resolveSessionKeyHeaderName();

    const invokePayload = {
      versionId: String(deploymentRow.version_id),
      sessionId: auth.correlationId,
      input: {
        prompt: input.prompt,
        messages: input.messages,
        toolMode: input.toolMode,
      },
      agent: {
        systemPrompt: typeof agentRow.system_prompt === "string" ? agentRow.system_prompt : undefined,
        model: {
          id: modelId,
          ...(typeof temperature === "number" ? { temperature } : {}),
          ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
        },
      },
    };

    const controller = new AbortController();
    const timeoutMs = 45_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const runtimeRes = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [headerName]: sessionKeyB64,
          "x-correlation-id": auth.correlationId,
        },
        body: JSON.stringify(invokePayload),
        signal: controller.signal,
      });

      const json = (await runtimeRes.json().catch(() => null)) as RuntimeInvokeResponse | null;
      if (!runtimeRes.ok) {
        return createErrorResponse(new Error("TEE runtime invoke failed"), {
          status: runtimeRes.status,
          customMessage: typeof json?.error === "string" ? json.error : "TEE runtime invoke failed",
        });
      }

      // Phase 4: persist any value-moving tool invocations to the unified agent_trade ledger.
      if (input.toolMode === "trading" && json?.ok === true) {
        const toolCalls = Array.isArray(json?.result?.toolCalls)
          ? (json.result.toolCalls as RuntimeInvokeToolCall[])
          : [];
        const toolResults = Array.isArray(json?.result?.toolResults)
          ? (json.result.toolResults as RuntimeInvokeToolResult[])
          : [];
        const resultsById = new Map<string, RuntimeInvokeToolResult>();
        for (const result of toolResults) {
          const toolCallId = typeof result?.toolCallId === "string" ? result.toolCallId : null;
          if (toolCallId) resultsById.set(toolCallId, result);
        }

        const nowIso = new Date().toISOString();
        const tradeRows: Array<Record<string, UntypedJson>> = [];

        for (const call of toolCalls) {
          const toolName = typeof call?.toolName === "string" ? call.toolName : "";
          const toolCallId = typeof call?.toolCallId === "string" ? call.toolCallId : "";
          if (!toolName || !toolCallId) continue;
          if (!isValueMovingToolName(toolName)) continue;

          const venue = parseMcpVenue(toolName);
          const inputPayload = call?.input;
          const outputPayload = resultsById.get(toolCallId)?.output ?? null;

          const txHash = extractTxHash(outputPayload);
          const orderId = extractOrderId(outputPayload);
          const idempotencyKey = txHash
            ? `${venue ?? "mcp"}:tx:${txHash}`
            : orderId
              ? `${venue ?? "mcp"}:order:${orderId}`
              : `invoke:${auth.correlationId}:${toolCallId}`;

          const notionalUsd = extractNotionalUsd(inputPayload);
          const pnlUsd = extractPnlUsd(outputPayload);
          const feesUsd = extractFeesUsd(outputPayload);
          const side = inferSide(inputPayload);
          const { base_asset, quote_asset } = inferAssetPair(inputPayload);
          const amount = extractAmount(inputPayload);
          const balancePre = extractBalancePre(outputPayload);
          const balancePost = extractBalancePost(outputPayload);
          const feesBreakdown = extractFeesBreakdown(outputPayload);
          const walletAddress = extractWalletAddress(inputPayload) ?? extractWalletAddress(outputPayload);
          const chainId = extractChainIdFromInput(inputPayload);
          const pnlPercent =
            pnlUsd != null && notionalUsd != null && notionalUsd > 0
              ? (pnlUsd / notionalUsd) * 100
              : null;
          const isWin = typeof pnlUsd === "number" ? pnlUsd > 0 : null;

          tradeRows.push({
            org_id: auth.orgId,
            agent_id: agentId,
            agent_version_id: deploymentRow.version_id,
            executed_at: nowIso,
            side,
            base_asset,
            quote_asset,
            amount,
            notional_usd: notionalUsd != null ? String(notionalUsd) : null,
            pnl_usd: pnlUsd != null ? String(pnlUsd) : undefined,
            pnl_percent: pnlPercent != null ? String(pnlPercent) : null,
            fees_usd: feesUsd != null ? String(feesUsd) : null,
            is_win: isWin,
            tx_hash: txHash,
            idempotency_key: idempotencyKey,
            request_id: auth.correlationId,
            venue,
            wallet_address: walletAddress,
            chain_id: chainId,
            balance_pre: balancePre,
            balance_post: balancePost,
            fees_breakdown: feesBreakdown,
            metadata: {
              tool: { toolName, toolCallId, input: inputPayload, output: outputPayload },
              deploymentId: deploymentRow.id,
              toolMode: input.toolMode,
            },
          });
        }

        if (tradeRows.length > 0) {
          const { error: tradeError } = await supabase
            .from("agent_trade")
            .upsert(tradeRows, { onConflict: "org_id,idempotency_key" });

          if (tradeError) {
            return createErrorResponse(new Error(tradeError.message), {
              status: 500,
              customMessage: "Trade recording failed",
            });
          }
        }
      }

      // Phase 6: usage metering for private agents accessed via usage listings.
      if (activeRental?.listingType === "usage") {
        const terms = activeRental.terms ?? {};
        const networkId = getTermString(terms, ["networkId", "network_id"]);
        const assetId = normalizeAssetId(getTermString(terms, ["assetId", "asset_id"]));

        let amountBaseUnits: string | null = null;
        let resolvedNetworkId: string | null = null;
        let resolvedAssetId: string | null = null;

        if (networkId) {
          const priceQuery = auth.supabase
            .from("agent_listing_price")
            .select("network_id, asset_id, price_base_units")
            .eq("listing_id", activeRental.listingId)
            .eq("network_id", networkId);
          if (assetId) {
            priceQuery.eq("asset_id", assetId);
          } else {
            priceQuery.is("asset_id", null);
          }
          const { data: priceRow, error: priceError } = await priceQuery.maybeSingle();
          if (priceError) {
            return createErrorResponse(new Error(priceError.message), { status: 400, customMessage: "Pricing lookup failed" });
          }
          if (priceRow) {
            const listingPrice = priceRow as AgentListingPriceRow;
            amountBaseUnits = listingPrice.price_base_units != null ? String(listingPrice.price_base_units) : null;
            resolvedNetworkId = listingPrice.network_id ?? networkId;
            resolvedAssetId = listingPrice.asset_id ?? assetId;
          }
        }

        const { error: usageError } = await service.from("agent_usage_event").upsert(
          [
            {
              org_id: auth.orgId,
              agent_id: agentId,
              listing_id: activeRental.listingId,
              renter_user_id: auth.userId,
              owner_user_id: auth.agentOwnerUserId,
              type: "agent_usage_invocation",
              amount_base_units: amountBaseUnits && amountBaseUnits.trim() ? amountBaseUnits : null,
              network_id: resolvedNetworkId,
              asset_id: resolvedAssetId,
              request_id: auth.correlationId,
              idempotency_key: `invoke:${auth.correlationId}`,
            },
          ],
          { onConflict: "idempotency_key" },
        );

        if (usageError) {
          return createErrorResponse(new Error(usageError.message), {
            status: 500,
            customMessage: "Usage metering failed",
          });
        }
      }

      return createSuccessResponse(
        { ok: true, runtime: json },
        { status: 200, headers: { "X-Correlation-Id": auth.correlationId } },
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
