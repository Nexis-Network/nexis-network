import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { listCdpWalletAccountRecords } from "@/server/wallets/user-wallets";
import {
  buildPumpfunBuyTransaction,
  buildPumpfunSellTransaction,
  getSolanaTokenHolding,
} from "@/server/services/pumpfun/transaction-builder";


const bodySchema = z.object({
  action: z.enum(["buy", "sell"]),
  cluster: z.enum(["mainnet-beta", "devnet"]).default("mainnet-beta"),
  mint: z.string().min(32, "mint is required"),
  buy: z
    .object({
      amountSol: z.number().positive(),
      slippageBps: z.number().int().min(1).max(5000).default(500),
    })
    .optional(),
  sell: z
    .object({
      percentOfPosition: z.number().int().min(1).max(100),
      slippageBps: z.number().int().min(1).max(5000).default(500),
    })
    .optional(),
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

  const wallets = await listCdpWalletAccountRecords(auth.session.user.id);
  const solanaWallet = wallets.find(
    (wallet) =>
      wallet.platform === "solana" &&
      wallet.status === "ready" &&
      typeof wallet.address === "string" &&
      wallet.address.length > 0,
  );

  if (!solanaWallet?.address) {
    return NextResponse.json(
      { success: false, error: { message: "wallet_not_found" } },
      { status: 404 },
    );
  }

  try {
    if (parsed.data.action === "buy") {
      if (!parsed.data.buy) {
        return NextResponse.json(
          { success: false, error: { message: "Buy parameters are required" } },
          { status: 400 },
        );
      }

      const result = await buildPumpfunBuyTransaction({
        cluster: parsed.data.cluster,
        buyerAddress: solanaWallet.address,
        mint: parsed.data.mint,
        amountSol: parsed.data.buy.amountSol,
        slippageBps: parsed.data.buy.slippageBps,
      });

      return NextResponse.json({
        success: true,
        data: {
          transaction: result.transaction,
          recentBlockhash: result.recentBlockhash,
          lastValidBlockHeight: result.lastValidBlockHeight,
          walletAddress: solanaWallet.address,
          transactionSummary: {
            side: "buy",
            walletAddress: solanaWallet.address,
            solAmount: parsed.data.buy.amountSol,
          },
        },
      });
    }

    if (!parsed.data.sell) {
      return NextResponse.json(
        { success: false, error: { message: "Sell parameters are required" } },
        { status: 400 },
      );
    }

    const holding = await getSolanaTokenHolding({
      cluster: parsed.data.cluster,
      ownerAddress: solanaWallet.address,
      mint: parsed.data.mint,
    });

    if (holding.amountRaw <= 0n) {
      return NextResponse.json(
        { success: false, error: { message: "No token balance available to sell" } },
        { status: 400 },
      );
    }

    let tokenAmountRaw =
      (holding.amountRaw * BigInt(parsed.data.sell.percentOfPosition)) / 100n;
    if (tokenAmountRaw <= 0n) {
      tokenAmountRaw = holding.amountRaw;
    }

    const result = await buildPumpfunSellTransaction({
      cluster: parsed.data.cluster,
      sellerAddress: solanaWallet.address,
      mint: parsed.data.mint,
      tokenAmountRaw,
      slippageBps: parsed.data.sell.slippageBps,
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction: result.transaction,
        recentBlockhash: result.recentBlockhash,
        lastValidBlockHeight: result.lastValidBlockHeight,
        walletAddress: solanaWallet.address,
        transactionSummary: {
          side: "sell",
          walletAddress: solanaWallet.address,
          tokenAmount:
            holding.decimals > 0
              ? Number(tokenAmountRaw) / 10 ** holding.decimals
              : Number(tokenAmountRaw),
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare Pump.fun trade";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
