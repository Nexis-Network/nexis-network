export const maxDuration = 15;

import { connection, NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse } from "@/lib/request-utils";
import { resolveAgentAccess } from "@/server/agents/agent-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const { id: agentId } = await context.params;
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: true, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    const shouldRedactConfig = access.shouldRedactConfig;

    const { data: agent, error: agentError } = await access.service
      .from("agent")
      .select("id, org_id, name, description, system_prompt, visibility, updated_at")
      .eq("id", agentId)
      .maybeSingle();
    if (agentError) {
      return createErrorResponse(new Error(agentError.message), {
        status: 404,
        customMessage: "Agent not found",
      });
    }
    if (!agent) {
      return createErrorResponse(new Error("Agent not found"), {
        status: 404,
        customMessage: "Agent not found",
      });
    }

    const { data: toolSummary } = shouldRedactConfig
      ? { data: null }
      : await access.service
          .from("agent_version")
          .select("config")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

    const { data: pricing } = await access.service
      .from("agent_listings_view")
      .select("listing_type, network_id, asset_id, price_base_units, currency_symbol, currency_decimals")
      .eq("agent_id", agentId);

    const normalizedPricing = normalizePricingRows(pricing ?? []);
    const sections = buildDocSections({ agent, toolSummary, pricing: normalizedPricing, redactSensitive: shouldRedactConfig });

    return createSuccessResponse(
      {
        agent: {
          id: agent.id,
          name: agent.name,
          visibility: agent.visibility,
          updated_at: agent.updated_at,
        },
        sections,
      },
      {
        headers: { "X-Correlation-Id": access.correlationId },
      },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

function buildDocSections({
  agent,
  toolSummary,
  pricing,
  redactSensitive,
}: {
  agent: { description?: string | null; system_prompt?: string | null };
  toolSummary: { config?: Record<string, UntypedJson> | null } | null;
  pricing: Array<{
    listing_type: string;
    network_id: string;
    asset_id: string | null;
    price_base_units: string;
    currency_symbol: string | null;
    currency_decimals: number;
  }>;
  redactSensitive: boolean;
}) {
  const sections = [] as Array<{ heading: string; body: string }>;

  const overview = agent.description?.trim() ?? "This agent has not published an overview yet.";
  sections.push({ heading: "Overview", body: overview });

  if (!redactSensitive && agent.system_prompt) {
    sections.push({ heading: "System Prompt", body: agent.system_prompt.trim() });
  }

  if (!redactSensitive && toolSummary?.config && typeof toolSummary.config === "object") {
    const enabledTools = Array.isArray((toolSummary.config).tools)
      ? ((toolSummary.config).tools as Array<{ id?: string }>).map((tool) => tool.id).filter(Boolean)
      : [];
    if (enabledTools.length > 0) {
      sections.push({ heading: "Enabled Tools", body: enabledTools.map((tool) => `• ${String(tool)}`).join("\n") });
    }
  }

  if (pricing.length > 0) {
    const priceLines = pricing.map((entry) => {
      const symbol = entry.currency_symbol ?? (entry.asset_id ? entry.asset_id : "NATIVE");
      const amount = formatBaseUnits(entry.price_base_units, entry.currency_decimals ?? 0);
      return `${entry.listing_type.toUpperCase()} — ${amount} ${symbol} (${entry.network_id})`;
    });
    sections.push({ heading: "Pricing", body: priceLines.join("\n") });
  }

  return sections;
}

function formatBaseUnits(value: string, decimals: number) {
  if (!/^[0-9]+$/.test(value)) return value;
  if (decimals <= 0) return value;
  const padded = value.padStart(decimals + 1, "0");
  const integer = padded.slice(0, -decimals).replace(/^0+/, "") || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer;
}

function normalizePricingRows(rows: UntypedJson): Array<{
  listing_type: string;
  network_id: string;
  asset_id: string | null;
  price_base_units: string;
  currency_symbol: string | null;
  currency_decimals: number;
}> {
  if (!Array.isArray(rows)) return [];
  const normalized: Array<{
    listing_type: string;
    network_id: string;
    asset_id: string | null;
    price_base_units: string;
    currency_symbol: string | null;
    currency_decimals: number;
  }> = [];

  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, UntypedJson>;
    const listingType = row.listing_type;
    const networkId = row.network_id;
    const priceBaseUnits = row.price_base_units;
    const currencyDecimalsRaw = row.currency_decimals;
    if (typeof listingType !== "string") continue;
    if (typeof networkId !== "string" || networkId.trim().length === 0) continue;
    if (priceBaseUnits === null || priceBaseUnits === undefined) continue;

    const currencyDecimals =
      typeof currencyDecimalsRaw === "string" ? Number(currencyDecimalsRaw) : currencyDecimalsRaw;
    if (
      typeof currencyDecimals !== "number" ||
      !Number.isFinite(currencyDecimals) ||
      !Number.isInteger(currencyDecimals) ||
      currencyDecimals < 0
    ) {
      continue;
    }

    normalized.push({
      listing_type: listingType,
      network_id: networkId,
      asset_id: (row.asset_id as string | null | undefined) ?? null,
      price_base_units: String(priceBaseUnits),
      currency_symbol: (row.currency_symbol as string | null | undefined) ?? null,
      currency_decimals: currencyDecimals,
    });
  }

  return normalized;
}
