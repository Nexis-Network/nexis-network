import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildPumpfunDashboardArtifact } from "@/server/services/pumpfun/dashboard-artifact";
import { withAuth } from "@/server/security/with-auth";
import { listCdpWalletAccountRecords } from "@/server/wallets/user-wallets";


const bodySchema = z.object({
  cluster: z.enum(["mainnet-beta", "devnet"]).default("mainnet-beta"),
  mint: z.string().min(32, "mint is required"),
  buyAmountSol: z.number().positive().max(10).default(0.05).optional(),
  sellPercent: z.number().min(1).max(100).default(25).optional(),
  slippageBps: z.number().int().min(1).max(5000).default(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok || !auth.session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 },
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { message: parsed.error.issues[0]?.message ?? "Invalid parameters" },
      },
      { status: 400 },
    );
  }

  try {
    const wallets = await listCdpWalletAccountRecords(auth.session.user.id);
    const solanaWallet =
      wallets.find(
        (wallet) =>
          wallet.platform === "solana" &&
          wallet.status === "ready" &&
          typeof wallet.address === "string" &&
          wallet.address.length > 0,
      )?.address ?? null;

    const artifact = await buildPumpfunDashboardArtifact({
      cluster: parsed.data.cluster,
      mint: parsed.data.mint,
      walletAddress: solanaWallet,
      buyAmountSol: parsed.data.buyAmountSol ?? 0.05,
      sellPercent: parsed.data.sellPercent ?? 25,
      slippageBps: parsed.data.slippageBps ?? 500,
    });

    return NextResponse.json({
      success: true,
      data: {
        artifact,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to inspect Pump.fun token";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
