import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { validateBody } from "@/lib/api-platform/validation";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { geoblockService, GeoblockError } from "@/server/services/polymarket/geoblock-service";
import { clobReadClient } from "@/server/services/polymarket/clob-read-client";
import { clobTradeClient, ClobTradeError } from "@/server/services/polymarket/clob-trade-client";
import { credentialStore } from "@/server/services/polymarket/credential-store";
import { buildOrder, OrderBuildError } from "@/server/services/polymarket/order-builder";
import { createClient } from "@/server/services/supabase/server";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import type { PolymarketOrderType } from "@/server/services/polymarket/constants";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// HITL Approval Token Store (server-side, short-lived)
// ---------------------------------------------------------------------------

const MAX_APPROVAL_TOKENS = 10_000;
const APPROVAL_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ApprovalEntry {
  userId: string;
  tokenId: string;
  side: string;
  price: number;
  size: number;
  orderType: string;
  expiresAt: number;
}

const approvalTokenStore = new Map<string, ApprovalEntry>();

function storeApprovalToken(token: string, entry: ApprovalEntry): void {
  // Evict oldest if at capacity
  if (approvalTokenStore.size >= MAX_APPROVAL_TOKENS) {
    const oldestKey = approvalTokenStore.keys().next().value;
    if (oldestKey) approvalTokenStore.delete(oldestKey);
  }
  approvalTokenStore.set(token, entry);
}

function consumeApprovalToken(token: string, userId: string): ApprovalEntry | null {
  const entry = approvalTokenStore.get(token);
  if (!entry) return null;
  if (entry.userId !== userId) return null;
  if (entry.expiresAt < Date.now()) {
    approvalTokenStore.delete(token);
    return null;
  }
  approvalTokenStore.delete(token); // One-time use
  return entry;
}

// Cleanup expired tokens every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of approvalTokenStore) {
    if (val.expiresAt < now) approvalTokenStore.delete(key);
  }
}, 60_000);


const tradeSchema = z.object({
  action: z.enum(["preview", "execute", "cancel", "cancel_all"]),
  tokenId: z.string().optional(),
  side: z.enum(["BUY", "SELL"]).optional(),
  price: z.coerce.number().min(0.001).max(0.999).optional(),
  size: z.coerce.number().positive().max(1_000_000, "Order size exceeds maximum of 1,000,000 shares").optional(),
  orderType: z.enum(["GTC", "GTD", "FOK", "FAK"]).default("GTC"),
  orderId: z.string().optional(),
  approvalToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false });
  if (!auth.ok) return auth.response;

  const userId = auth.session?.user?.id;
  if (!userId) return apiResponse.unauthorized();

  const rl = await checkRateLimit(`polymarket:trade:${userId}`);
  if (!rl.success) {
    return apiResponse.error("RATE_LIMITED", "Too many requests", 429);
  }

  const validation = await validateBody(request, tradeSchema);
  if (!validation.success) return validation.response;

  const { action, tokenId, side, price, size, orderType, orderId } = validation.data;

  // User-scoped client for credential operations (RLS enforced)
  const userSupabase = await createClient();
  if (!userSupabase) {
    return apiResponse.internalError("Database unavailable");
  }
  // Admin client for audit logging only (server-side writes)
  const adminSupabase = getSupabaseAdminClient();
  const logId = randomUUID();

  try {
    // ---- Cancel flows (no geoblock needed) ----
    if (action === "cancel") {
      if (!orderId) return apiResponse.badRequest("orderId is required for cancel");
      const result = await clobTradeClient.cancelOrder(userSupabase, userId, orderId);
      await logOrder(adminSupabase, logId, userId, { orderId, status: "cancelled" }, result);
      return apiResponse.success(result);
    }

    if (action === "cancel_all") {
      const result = await clobTradeClient.cancelAll(userSupabase, userId);
      await logOrder(adminSupabase, logId, userId, { status: "cancel_all" }, result);
      return apiResponse.success(result);
    }

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip")?.trim() ??
      undefined;

    const geoStatus = await geoblockService.enforce(clientIp);

    if (action === "preview") {
      // Preview requires full trade parameters
      if (!tokenId || !side || price === undefined || size === undefined) {
        return apiResponse.badRequest("tokenId, side, price, and size are required for preview");
      }
      const [marketParams, creds] = await Promise.all([
        clobReadClient.getMarketParams(tokenId),
        credentialStore.load(userSupabase, userId),
      ]);

      if (!creds) {
        return apiResponse.badRequest(
          "No Polymarket credentials found. Please connect your wallet first.",
          "NO_CREDENTIALS",
        );
      }

      const cost = (price * size).toFixed(6);
      const feeRate = marketParams.feeRateBps / 10_000;
      const fees = (Number(cost) * feeRate).toFixed(6);
      const total = (Number(cost) + Number(fees)).toFixed(6);
      const potentialPayout = (size * 1).toFixed(6);
      const approvalToken = randomUUID();

      // Store the approval token server-side for HITL validation on execute
      storeApprovalToken(approvalToken, {
        userId,
        tokenId,
        side,
        price,
        size,
        orderType: orderType ?? "GTC",
        expiresAt: Date.now() + APPROVAL_TTL_MS,
      });

      const preview = {
        order: { tokenId, side, price, size, orderType, tickSize: marketParams.tickSize, negRisk: marketParams.negRisk },
        estimate: { cost, fees, total, potentialPayout },
        geoStatus: { closeOnly: geoStatus.closeOnly, country: geoStatus.country },
        approvalToken,
      };

      await logOrder(adminSupabase, logId, userId, { tokenId, side, price, size, orderType, status: "preview" }, preview);
      return apiResponse.success(preview);
    }

    // ---- Execute (requires valid approval token from preview) ----
    if (!validation.data.approvalToken) {
      return apiResponse.badRequest(
        "approvalToken is required. Use the 'preview' action first to obtain one.",
      );
    }

    const approved = consumeApprovalToken(validation.data.approvalToken, userId);
    if (!approved) {
      return apiResponse.error(
        "INVALID_APPROVAL",
        "Invalid or expired approval token. Please create a new preview.",
        403,
      );
    }

    // Use the parameters from the approved preview, not from the request body,
    // to prevent parameter tampering between preview and execute.

    // Enforce close-only: BUY orders blocked in close-only regions
    if (geoStatus.closeOnly && approved.side === "BUY") {
      return apiResponse.forbidden(
        "Your region is in close-only mode. You can sell existing positions and cancel orders, but cannot open new positions.",
      );
    }

    // 1. Load user credentials
    const creds = await credentialStore.load(userSupabase, userId);
    if (!creds) {
      return apiResponse.badRequest(
        "No Polymarket credentials found. Please connect your wallet first.",
        "NO_CREDENTIALS",
      );
    }

    // 2. Fetch market parameters for the token
    const marketParams = await clobReadClient.getMarketParams(approved.tokenId);

    // 3. Build the signed order
    const signedOrder = buildOrder(creds, {
      tokenId: approved.tokenId,
      side: approved.side as "BUY" | "SELL",
      price: approved.price,
      size: approved.size,
      tickSize: marketParams.tickSize,
      negRisk: marketParams.negRisk,
      feeRateBps: marketParams.feeRateBps,
    });

    // 4. Submit the order to the CLOB
    const orderResponse = await clobTradeClient.postOrder(
      userSupabase,
      userId,
      signedOrder,
      approved.orderType as PolymarketOrderType,
    );

    const result = {
      submitted: orderResponse.success,
      orderId: orderResponse.orderID,
      status: orderResponse.status,
      orderType: approved.orderType as PolymarketOrderType,
      transactionHashes: orderResponse.transactionsHashes ?? [],
      ...(orderResponse.errorMsg && { errorMsg: orderResponse.errorMsg }),
    };

    await logOrder(adminSupabase, logId, userId, {
      orderId: orderResponse.orderID,
      tokenId: approved.tokenId,
      side: approved.side,
      price: approved.price,
      size: approved.size,
      orderType: approved.orderType,
      status: orderResponse.success ? "submitted" : "failed",
    }, result);

    if (!orderResponse.success) {
      return apiResponse.error(
        "ORDER_FAILED",
        orderResponse.errorMsg ?? "Order submission failed on the CLOB",
        422,
      );
    }

    return apiResponse.success(result);
  } catch (error) {
    if (error instanceof GeoblockError) {
      return apiResponse.forbidden(error.message);
    }
    if (error instanceof OrderBuildError) {
      return apiResponse.badRequest(error.message, "ORDER_BUILD_ERROR");
    }
    if (error instanceof ClobTradeError) {
      logger.error("[polymarket:trade] CLOB error", {
        userId,
        action,
        logId,
        statusCode: error.statusCode,
        responseText: error.responseText,
      });
      // Log the failed order attempt
      await logOrder(adminSupabase, logId, userId, {
        status: "clob_error",
      }, { error: error.message, statusCode: error.statusCode });

      return apiResponse.error(
        "CLOB_ERROR",
        `Order failed: ${error.responseText.slice(0, 200)}`,
        error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 502,
      );
    }
    logger.error("[polymarket:trade] POST failed", { userId, action, logId, error });
    return apiResponse.internalError("Trade operation failed");
  }
}

// ---------------------------------------------------------------------------
// Audit log helper
// ---------------------------------------------------------------------------

async function logOrder(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  logId: string,
  userId: string,
  params: {
    orderId?: string;
    conditionId?: string;
    tokenId?: string;
    side?: string;
    price?: number;
    size?: number;
    orderType?: string;
    status: string;
  },
  responseData: unknown,
): Promise<void> {
  try {
    await supabase.from("polymarket_order_log").insert({
      id: logId,
      user_id: userId,
      order_id: params.orderId ?? logId,
      condition_id: params.conditionId ?? "",
      token_id: params.tokenId ?? "",
      side: params.side ?? "BUY",
      price: params.price ?? 0,
      size: params.size ?? 0,
      order_type: params.orderType ?? "GTC",
      status: params.status,
      response_data: responseData,
    });
  } catch (err) {
    logger.warn("[polymarket:trade] Failed to log order", { logId, err });
  }
}
