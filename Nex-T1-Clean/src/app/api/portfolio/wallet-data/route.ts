import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";

import { fetchWalletPortfolioSnapshot } from "@/server/portfolio/wallet-data";

export async function GET(req: NextRequest) {
  await connection();
  const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
  if (!auth.ok) {
    return apiResponse.unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId");

  if (!address) {
    return apiResponse.badRequest("address_required");
  }

  try {
    const snapshot = await fetchWalletPortfolioSnapshot({ address, chainId });
    return apiResponse.success(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch wallet data";
    const status = ["missing_address", "invalid_evm_address", "invalid_solana_address"].includes(message) ? 400 : 500;
    return apiResponse.error("WALLET_DATA_FAILED", message, status);
  }
}

