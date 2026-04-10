export const maxDuration = 15;

import { connection, NextRequest } from "next/server";
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse, getOrCreateCorrelationId } from '@/lib/request-utils';
import { claimIdempotencyKey } from '@/server/security/idempotency';
import { withAuth } from '@/server/security/with-auth';
import { createServiceRoleClient } from '@/server/services/supabase/service-role';
import { resolveAgentAccess } from "@/server/agents/agent-access";

const StartSchema = z.object({
  listingId: z.string().uuid(),
  idempotencyKey: z.string().min(8),
  terms: z.record(z.string(), z.any()).optional(),
  // Back-compat: ignored.
  orgId: z.string().uuid().optional(),
  renterUserId: z.string().uuid().optional(),
}).passthrough();

const CancelSchema = z.object({
  rentalId: z.string().uuid(),
}).passthrough();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getTermString(terms: Record<string, UntypedJson> | null | undefined, keys: string[]): string | null {
  if (!terms) return null;
  for (const key of keys) {
    const value = terms[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeAssetId(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'native') return null;
  return trimmed;
}

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
    if (!auth.ok) return auth.response;
    if (!auth.session?.user?.id) {
      return createErrorResponse(new Error('Unauthenticated'), { status: 401 });
    }
    const { id: agentId } = await context.params;

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const { data: listingIds, error: listingError } = await access.service
      .from('agent_listing')
      .select('id')
      .eq('agent_id', agentId);

    if (listingError) {
      return createErrorResponse(new Error(listingError.message), { status: 400, customMessage: 'listing lookup failed' });
    }

    const ids = (listingIds ?? []).map((row) => (row as { id: string }).id);
    if (!ids.length) {
      return createSuccessResponse({ ok: true, rentals: [] }, { headers: { 'X-Correlation-Id': correlationId } });
    }

    const { data: rentals, error: rentalsError } = await access.service
      .from('agent_rental')
      .select('id, listing_id, state, start_ts, end_ts, terms')
      .eq('renter_user_id', auth.session.user.id)
      .in('listing_id', ids)
      .order('start_ts', { ascending: false })
      .limit(25);

    if (rentalsError) {
      return createErrorResponse(new Error(rentalsError.message), { status: 400, customMessage: 'rental lookup failed' });
    }

    return createSuccessResponse({ ok: true, rentals: rentals ?? [] }, { headers: { 'X-Correlation-Id': correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
    if (!auth.ok) return auth.response;
    if (!auth.session?.user?.id) {
      return createErrorResponse(new Error('Unauthenticated'), { status: 401 });
    }
    const { id: agentId } = await context.params;
    const input = StartSchema.parse(await req.json());
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const { data: listingRow, error: listingError } = await access.service
      .from('agent_listing')
      .select('id, agent_id, org_id, listing_type, active')
      .eq('id', input.listingId)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (listingError) {
      return createErrorResponse(new Error(listingError.message), { status: 400, customMessage: 'listing lookup failed' });
    }
    if (!listingRow) {
      return createErrorResponse(new Error('Listing not found'), { status: 404, customMessage: 'listing not found' });
    }
    if (!(listingRow as { active?: boolean | null }).active) {
      return createErrorResponse(new Error('Listing inactive'), { status: 400, customMessage: 'listing not active' });
    }

    const listingType = (listingRow as { listing_type?: string | null }).listing_type ?? null;
    if (listingType !== 'rent' && listingType !== 'usage') {
      return createErrorResponse(new Error('unsupported_listing_type'), { status: 400, customMessage: 'Only rent/usage listings can be activated.' });
    }

    const terms = (input.terms ?? {}) as Record<string, UntypedJson>;
    const networkId = getTermString(terms, ['networkId', 'network_id']);
    const assetId = normalizeAssetId(getTermString(terms, ['assetId', 'asset_id']));
    if (!networkId) {
      return createErrorResponse(new Error('networkId_missing'), { status: 400, customMessage: 'terms.networkId is required' });
    }

    const priceQuery = access.service
      .from('agent_listing_price')
      .select('network_id, asset_id, price_base_units, currency_symbol, currency_decimals')
      .eq('listing_id', input.listingId)
      .eq('network_id', networkId);
    if (assetId) {
      priceQuery.eq('asset_id', assetId);
    } else {
      priceQuery.is('asset_id', null);
    }

    const { data: priceRow, error: priceError } = await priceQuery.maybeSingle();
    if (priceError) {
      return createErrorResponse(new Error(priceError.message), { status: 400, customMessage: 'pricing lookup failed' });
    }
    if (!priceRow) {
      return createErrorResponse(new Error('pricing_missing'), { status: 400, customMessage: 'No matching price configured for listing.' });
    }

    const idem = await claimIdempotencyKey(input.idempotencyKey);
    if (!idem.ok) return createErrorResponse(new Error('duplicate'), { status: 409, customMessage: 'Duplicate idempotency key' });
    const renterUserId = auth.session.user.id;
    const orgId = (listingRow).org_id as string;
    const { data: rental, error } = await access.service
      .from('agent_rental')
      .insert({
        org_id: orgId,
        listing_id: input.listingId,
        renter_user_id: renterUserId,
        state: 'active',
        terms: input.terms ?? {},
        idempotency_key: input.idempotencyKey,
      })
      .select('id, org_id, listing_id, renter_user_id, state, terms, idempotency_key, start_ts, end_ts')
      .single();
    if (error) return createErrorResponse(new Error(error.message), { status: 400, customMessage: 'rental insert failed' });

    // Record a billing/usage event (service-role only due to RLS).
    const service = createServiceRoleClient();
    const { data: ownerRow } = await service
      .from('agent')
      .select('owner_user_id')
      .eq('id', agentId)
      .eq('org_id', orgId)
      .maybeSingle();
    const ownerUserId = (ownerRow as { owner_user_id?: string | null } | null)?.owner_user_id ?? null;

    const eventType = listingType === 'rent' ? 'agent_rental_started' : 'agent_usage_activated';
    const amountBaseUnits = listingType === 'rent' ? String((priceRow).price_base_units ?? '') : null;

    await service.from('agent_usage_event').insert({
      org_id: orgId,
      agent_id: agentId,
      listing_id: input.listingId,
      renter_user_id: renterUserId,
      owner_user_id: ownerUserId,
      type: eventType,
      amount_base_units: amountBaseUnits && amountBaseUnits.trim() ? amountBaseUnits : null,
      network_id: (priceRow).network_id ?? networkId,
      asset_id: (priceRow).asset_id ?? assetId,
      request_id: correlationId,
      idempotency_key: `rental:${rental.id}`,
    });

    return createSuccessResponse({ ok: true, rental }, { headers: { 'X-Correlation-Id': correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
    if (!auth.ok) return auth.response;
    if (!auth.session?.user?.id) {
      return createErrorResponse(new Error('Unauthenticated'), { status: 401 });
    }
    const { id: agentId } = await context.params;
    const input = CancelSchema.parse(await req.json().catch(() => ({})));

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const { data: rentalRow, error: rentalError } = await access.service
      .from('agent_rental')
      .select('id, listing_id, renter_user_id, state')
      .eq('id', input.rentalId)
      .maybeSingle();

    if (rentalError) {
      return createErrorResponse(new Error(rentalError.message), { status: 400, customMessage: 'rental lookup failed' });
    }
    if (!rentalRow) {
      return createErrorResponse(new Error('Rental not found'), { status: 404, customMessage: 'rental not found' });
    }
    if ((rentalRow).renter_user_id !== auth.session.user.id) {
      return createErrorResponse(new Error('Forbidden'), { status: 403 });
    }
    if ((rentalRow).state !== 'active') {
      return createErrorResponse(new Error('rental_not_active'), { status: 400, customMessage: 'rental is not active' });
    }

    const listingId = (rentalRow).listing_id as string | null;
    if (!listingId) {
      return createErrorResponse(new Error('listing_missing'), { status: 400, customMessage: 'rental missing listing' });
    }

    const { data: listingRow, error: listingError } = await access.service
      .from('agent_listing')
      .select('id, org_id, agent_id')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) {
      return createErrorResponse(new Error(listingError.message), { status: 400, customMessage: 'listing lookup failed' });
    }
    if (!listingRow || (listingRow).agent_id !== agentId) {
      return createErrorResponse(new Error('Forbidden'), { status: 403 });
    }

    const { data: cancelled, error: cancelError } = await access.service
      .from('agent_rental')
      .update({ state: 'cancelled', end_ts: new Date().toISOString() })
      .eq('id', input.rentalId)
      .select('id, listing_id, state, start_ts, end_ts, terms')
      .single();

    if (cancelError) {
      return createErrorResponse(new Error(cancelError.message), { status: 400, customMessage: 'rental cancel failed' });
    }

    const service = createServiceRoleClient();
    await service.from('agent_usage_event').insert({
      org_id: (listingRow).org_id,
      agent_id: agentId,
      listing_id: listingId,
      renter_user_id: auth.session.user.id,
      type: 'agent_rental_cancelled',
      request_id: correlationId,
      idempotency_key: `rental-cancel:${cancelled.id}`,
    });

    return createSuccessResponse({ ok: true, rental: cancelled }, { headers: { 'X-Correlation-Id': correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
