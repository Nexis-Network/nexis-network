import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { resolveOwnedCdpWallet } from "@/server/services/cdp/ownership";

export async function authorizeCdpWalletBalanceRequest(
  request: NextRequest,
  address: string,
): Promise<{ response: NextResponse | null; walletAddress: string | null }> {
  const { context } = await resolveSupabaseContext(undefined, { request });
  if (!context) {
    return {
      response: apiResponse.unauthorized("Valid session required"),
      walletAddress: null,
    };
  }

  const ownedWallet = await resolveOwnedCdpWallet(context.userId, address);
  if (!ownedWallet) {
    return {
      response: apiResponse.forbidden("Address not linked to your account"),
      walletAddress: null,
    };
  }

  return {
    response: null,
    walletAddress: ownedWallet.address,
  };
}

