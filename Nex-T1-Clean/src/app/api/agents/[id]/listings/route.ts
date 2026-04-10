export const maxDuration = 15;

import { connection, NextRequest } from "next/server";
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '@/lib/request-utils';
import { canManageAgent } from '@/server/agents/access';
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { logger } from '@/lib/logger';

const ListingSchema = z.object({
  listingType: z.enum(['sale','rent','usage']),
  active: z.boolean().default(true),
  prices: z.array(z.object({ networkId: z.string(), assetId: z.string().optional(), priceBaseUnits: z.string().regex(/^\d+$/), currencySymbol: z.string().optional(), currencyDecimals: z.number().int().nonnegative().default(0) })).min(1),
});

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

    const { data: listings, error } = await access.service
      .from("agent_listing")
      .select(
        "id, listing_type, agent_listing_price(network_id, asset_id, price_base_units, currency_symbol, currency_decimals)",
      )
      .eq("org_id", access.agent.orgId)
      .eq("agent_id", agentId)
      .eq("active", true)
      .order("listing_type", { ascending: true });

    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 400,
        customMessage: 'Failed to load listings',
      });
    }

    const flattened = (listings ?? []).flatMap((listing) => {
      const row = listing as {
        id: string;
        listing_type: "sale" | "rent" | "usage";
        agent_listing_price?: Array<{
          network_id: string;
          asset_id: string | null;
          price_base_units: string | number;
          currency_symbol: string | null;
          currency_decimals: number;
        }> | null;
      };

      const prices = Array.isArray(row.agent_listing_price) ? row.agent_listing_price : [];
      return prices.map((price) => ({
        listing_id: row.id,
        listing_type: row.listing_type,
        network_id: price.network_id,
        asset_id: price.asset_id ?? null,
        price_base_units: String(price.price_base_units),
        currency_symbol: price.currency_symbol ?? null,
        currency_decimals: price.currency_decimals,
      }));
    });

    return createSuccessResponse(flattened, {
      headers: { 'X-Correlation-Id': access.correlationId },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const input = ListingSchema.parse(await req.json());
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    if (!canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error('Forbidden'), { status: 403 });
    }

    // Step 1: Insert listing
    const { data: listing, error } = await access.service
      .from('agent_listing')
      .insert({ org_id: access.agent.orgId, agent_id: agentId, listing_type: input.listingType, active: input.active })
      .select('id')
      .single();
    if (error) {
      return createErrorResponse(new Error(error.message), { status: 400, customMessage: 'listing insert failed' });
    }

    // Step 2: Insert prices — if this fails, roll back the listing to prevent orphans
    const rows = input.prices.map((p) => ({
      org_id: access.agent.orgId,
      listing_id: listing.id,
      network_id: p.networkId,
      asset_id: p.assetId ?? null,
      price_base_units: p.priceBaseUnits,
      currency_symbol: p.currencySymbol ?? null,
      currency_decimals: p.currencyDecimals,
    }));
    const { error: priceError } = await access.service.from('agent_listing_price').insert(rows);
    if (priceError) {
      // Compensating transaction: remove the orphaned listing
      const { error: rollbackError } = await access.service
        .from('agent_listing')
        .delete()
        .eq('id', listing.id);
      if (rollbackError) {
        logger.error("listing_price_rollback_failed", {
          listingId: listing.id,
          agentId,
          priceError: priceError.message,
          rollbackError: rollbackError.message,
        });
      }
      return createErrorResponse(new Error(priceError.message), { status: 400, customMessage: 'price insert failed' });
    }

    return createSuccessResponse({ ok: true, listingId: listing.id }, { headers: { 'X-Correlation-Id': access.correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
