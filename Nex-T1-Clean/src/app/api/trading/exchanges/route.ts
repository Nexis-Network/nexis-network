/**
 * Exchange Connections API Route
 * 
 * Domain: api/trading/exchanges
 * Responsibility: CRUD operations for user exchange connections
 * 
 * GET - List user's exchange connections
 * POST - Add new exchange connection
 * DELETE - Remove exchange connection
 * PATCH - Toggle active status
 */

import { connection, NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { createCookieBridge } from '@/server/auth/cookie-bridge';
import { resolveSupabaseContext } from '@/server/auth/auth-context';
import {
  listUserExchanges,
  addUserExchange,
  removeUserExchange,
  toggleUserExchange,
} from '@/server/services/trading/credentials';
import type { ExchangeId } from '@/server/services/trading/types';
import { logger } from '@/lib/logger';


// GET /api/trading/exchanges - List user's exchange connections
export async function GET() {
  await connection();
  try {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });

    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await listUserExchanges(context.userId);

    return NextResponse.json({ connections });
  } catch (error) {
    logger.error('[api/trading/exchanges] GET failed', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange connections' },
      { status: 500 }
    );
  }
}

// POST /api/trading/exchanges - Add new exchange connection
export async function POST(request: NextRequest) {
  try {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });

    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exchangeId, label, apiKey, apiSecret, passphrase, isTestnet, permissions } = body;

    // Validate required fields
    if (!exchangeId || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing required fields: exchangeId, apiKey, apiSecret' },
        { status: 400 }
      );
    }

    const connection = await addUserExchange(
      context.userId,
      exchangeId as ExchangeId,
      apiKey,
      apiSecret,
      {
        label,
        passphrase,
        isTestnet,
        permissions,
      }
    );

    logger.info('[api/trading/exchanges] Connection added', {
      userId: context.userId,
      exchangeId,
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    logger.error('[api/trading/exchanges] POST failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add exchange connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/trading/exchanges - Remove exchange connection
export async function DELETE(request: NextRequest) {
  try {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });

    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connection ID' }, { status: 400 });
    }

    const success = await removeUserExchange(context.userId, connectionId);

    if (!success) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[api/trading/exchanges] DELETE failed', error);
    return NextResponse.json(
      { error: 'Failed to remove exchange connection' },
      { status: 500 }
    );
  }
}

// PATCH /api/trading/exchanges - Toggle active status
export async function PATCH(request: NextRequest) {
  try {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });

    if (!context?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, isActive } = body;

    if (!connectionId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: connectionId, isActive' },
        { status: 400 }
      );
    }

    const success = await toggleUserExchange(context.userId, connectionId, isActive);

    if (!success) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[api/trading/exchanges] PATCH failed', error);
    return NextResponse.json(
      { error: 'Failed to update exchange connection' },
      { status: 500 }
    );
  }
}
