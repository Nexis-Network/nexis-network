export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCdpClient } from "@/server/services/cdp/client";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { checkRateLimit, cdpSpendPermissionRateLimit } from "@/server/security/rate-limit";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * CDP Spend Permission API
 *
 * POST  — Create a new spend permission (called by AI tool after HITL approval)
 * GET   — List active spend permissions for the user's Smart Account
 * DELETE — Revoke a spend permission by permissionHash
 *
 * The CDP SDK's EvmClient uses single-object argument methods:
 * - createSpendPermission({ spendPermission, network })
 * - listSpendPermissions({ address })
 * - revokeSpendPermission({ address, permissionHash, network })
 */

const SPEND_PERMISSION_NETWORKS = [
  "base", "base-sepolia", "ethereum", "ethereum-sepolia",
  "optimism", "arbitrum", "avalanche", "polygon",
] as const;

// ─── POST: Create Spend Permission ──────────────────────────────────────────

// Max allowance: 10^30 (well above any practical token amount, prevents overflow)
const MAX_ALLOWANCE = BigInt("1000000000000000000000000000000");

const TOKEN_PATTERN = /^(eth|usdc|0x[a-fA-F0-9]{40})$/;

const createSchema = z.object({
  userId: z.string().uuid(),
  spender: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid spender address"),
  token: z.string().regex(TOKEN_PATTERN, "Token must be 'eth', 'usdc', or a valid EVM contract address"),
  allowance: z
    .string()
    .regex(/^[1-9]\d{0,38}$/, "Allowance must be a positive integer string")
    .refine(
      (v) => { try { return BigInt(v) > 0n && BigInt(v) <= MAX_ALLOWANCE; } catch { return false; } },
      "Allowance exceeds maximum permitted value",
    ),
  periodDays: z.number().min(1).max(365).default(1),
  network: z.enum(SPEND_PERMISSION_NETWORKS).default("base"),
});

export async function POST(request: NextRequest) {
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const rl = await checkRateLimit(session.user.id, cdpSpendPermissionRateLimit);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests" } },
      { status: 429, headers: rl.headers },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: parsed.error.issues[0]?.message ?? "Invalid parameters" } },
      { status: 400 },
    );
  }

  // Only allow the authenticated user to create permissions for themselves
  if (parsed.data.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: { message: "User ID mismatch" } },
      { status: 403 },
    );
  }

  const cdp = await getCdpClient();
  if (!cdp) {
    return NextResponse.json(
      { success: false, error: { message: "CDP server not configured" } },
      { status: 503 },
    );
  }

  try {
    const smartAccountAddress = await resolveUserSmartAccount(session.user.id);
    if (!smartAccountAddress) {
      return NextResponse.json(
        { success: false, error: { message: "No Nex Wallet (EVM) found for this user" } },
        { status: 404 },
      );
    }

    const now = new Date();
    // End date = max(30 days, periodDays * 2) — ensures at least 2 full periods or 30 days
    const endMs = Math.max(30, parsed.data.periodDays * 2) * 24 * 60 * 60 * 1000;
    const end = new Date(now.getTime() + endMs);

    // CDP SDK accepts "eth" | "usdc" | "0x..." for token
    // and bigint for allowance
    const result = await cdp.evm.createSpendPermission({
      spendPermission: {
        account: smartAccountAddress as `0x${string}`,
        spender: parsed.data.spender as `0x${string}`,
        token: parsed.data.token as "eth" | "usdc" | `0x${string}`,
        allowance: BigInt(parsed.data.allowance),
        periodInDays: parsed.data.periodDays,
        start: now,
        end,
      },
      network: parsed.data.network,
    });

    logger.info("cdp_spend_permission_created", {
      userId: session.user.id,
      smartAccount: smartAccountAddress,
      spender: parsed.data.spender,
      network: parsed.data.network,
      userOpHash: result.userOpHash,
    });

    return NextResponse.json({
      success: true,
      data: {
        userOperationHash: result.userOpHash,
        smartAccount: smartAccountAddress,
        spender: parsed.data.spender,
        token: parsed.data.token,
        network: parsed.data.network,
      },
    });
  } catch (err) {
    logger.error("cdp_spend_permission_create_failed", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
      network: parsed.data.network,
    });
    return NextResponse.json(
      { success: false, error: { message: "Failed to create spend permission" } },
      { status: 502 },
    );
  }
}

// ─── GET: List Spend Permissions ────────────────────────────────────────────

export async function GET() {
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const rlGet = await checkRateLimit(session.user.id, cdpSpendPermissionRateLimit);
  if (!rlGet.success) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests" } },
      { status: 429, headers: rlGet.headers },
    );
  }

  const cdp = await getCdpClient();
  if (!cdp) {
    return NextResponse.json(
      { success: false, error: { message: "CDP server not configured" } },
      { status: 503 },
    );
  }

  try {
    const smartAccountAddress = await resolveUserSmartAccount(session.user.id);
    if (!smartAccountAddress) {
      return NextResponse.json({ success: true, data: { permissions: [] } });
    }

    const result = await cdp.evm.listSpendPermissions({
      address: smartAccountAddress as `0x${string}`,
    });

    // Serialize spend permissions for JSON (bigint → string)
    const permissions = (result.spendPermissions ?? []).map((p) => ({
      permissionHash: p.permissionHash,
      spender: p.permission.spender,
      token: p.permission.token,
      allowance: String(p.permission.allowance),
      period: String(p.permission.period),
      start: String(p.permission.start),
      end: String(p.permission.end),
      network: p.network,
      revoked: p.revoked,
      revokedAt: p.revokedAt ?? null,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ success: true, data: { permissions } });
  } catch (err) {
    logger.error("cdp_spend_permission_list_failed", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
    });
    return NextResponse.json(
      { success: false, error: { message: "Failed to list spend permissions" } },
      { status: 502 },
    );
  }
}

// ─── DELETE: Revoke Spend Permission ────────────────────────────────────────

const revokeSchema = z.object({
  permissionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid permission hash format"),
  network: z.enum(SPEND_PERMISSION_NETWORKS).default("base"),
});

export async function DELETE(request: NextRequest) {
  const session = await getVerifiedSupabaseSession({});
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
    );
  }

  const rlDel = await checkRateLimit(session.user.id, cdpSpendPermissionRateLimit);
  if (!rlDel.success) {
    return NextResponse.json(
      { success: false, error: { message: "Too many requests" } },
      { status: 429, headers: rlDel.headers },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { message: parsed.error.issues[0]?.message ?? "Invalid parameters" } },
      { status: 400 },
    );
  }

  const cdp = await getCdpClient();
  if (!cdp) {
    return NextResponse.json(
      { success: false, error: { message: "CDP server not configured" } },
      { status: 503 },
    );
  }

  try {
    const smartAccountAddress = await resolveUserSmartAccount(session.user.id);
    if (!smartAccountAddress) {
      return NextResponse.json(
        { success: false, error: { message: "No Nex Wallet (EVM) found" } },
        { status: 404 },
      );
    }

    const result = await cdp.evm.revokeSpendPermission({
      address: smartAccountAddress as `0x${string}`,
      permissionHash: parsed.data.permissionHash as `0x${string}`,
      network: parsed.data.network,
    });

    logger.info("cdp_spend_permission_revoked", {
      userId: session.user.id,
      permissionHash: parsed.data.permissionHash,
      userOpHash: result.userOpHash,
    });

    return NextResponse.json({
      success: true,
      data: { userOperationHash: result.userOpHash },
    });
  } catch (err) {
    logger.error("cdp_spend_permission_revoke_failed", {
      error: err instanceof Error ? err.message : String(err),
      userId: session.user.id,
      permissionHash: parsed.data.permissionHash,
    });
    return NextResponse.json(
      { success: false, error: { message: "Failed to revoke spend permission" } },
      { status: 502 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveUserSmartAccount(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("wallet_accounts")
    .select("address")
    .eq("user_id", userId)
    .eq("wallet_type", "cdp")
    .eq("wallet_id", "cdp:evm:smart")
    .maybeSingle();

  return data?.address ?? null;
}
