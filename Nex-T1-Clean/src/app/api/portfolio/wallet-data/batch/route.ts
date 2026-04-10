import { NextRequest } from "next/server";
import { z } from "zod";
import { apiResponse } from "@/lib/api-platform";

import { fetchWalletPortfolioSnapshot } from "@/server/portfolio/wallet-data";


const WalletSchema = z.object({
  address: z.string().min(1),
  chainId: z.union([z.string(), z.number()]).optional(),
});

const BodySchema = z.object({
  wallets: z.array(WalletSchema).min(1).max(20),
});

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const unique = new Map<string, { address: string; chainId?: string | number }>();
  for (const wallet of parsed.data.wallets) {
    const key = `${wallet.address.toLowerCase()}::${String(wallet.chainId ?? "")}`;
    if (!unique.has(key)) {
      unique.set(key, wallet);
    }
  }

  const items = await Promise.all(
    Array.from(unique.values()).map(async (wallet) => {
      try {
        const data = await fetchWalletPortfolioSnapshot({ address: wallet.address, chainId: wallet.chainId });
        return { address: wallet.address, chainId: wallet.chainId ?? null, ok: true, data };
      } catch (error) {
        const message = error instanceof Error ? error.message : "wallet_data_failed";
        return { address: wallet.address, chainId: wallet.chainId ?? null, ok: false, error: message };
      }
    }),
  );

  return apiResponse.success({ items });
}

