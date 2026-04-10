import { NextResponse, type NextRequest } from "next/server";

import { buildWalletHomeAggregate } from "@/server/mobile-contracts/wallet-home";
import { withAuth } from "@/server/security/with-auth";
import { PortfolioService } from "@/server/services/portfolio-service";

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) {
    return auth.response;
  }

  if (!auth.session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      evmAddress?: string | null;
      solanaAddress?: string | null;
      weeklyDepositUsd?: number;
      ytdReturnHintPercent?: number;
      targetYear?: number;
      timeframe?: "1D" | "1W" | "1M" | "6M" | "1Y";
    };

    const portfolio = await PortfolioService.getAggregatedPortfolio(auth.session.user.id);
    return NextResponse.json(
      buildWalletHomeAggregate({
        portfolio,
        request: body,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load wallet home aggregate.",
      },
      { status: 500 },
    );
  }
}
