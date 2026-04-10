import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { WalletAssetsService } from "@/server/services/wallet-assets";


import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  await connection();
  const auth = await withAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.session) {
    return apiResponse.unauthorized();
  }

  const userId = auth.session.user.id;

  const { searchParams } = new URL(request.url);
  const walletId = searchParams.get("walletId");
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId"); 

  if (!walletId || !address) {
    return apiResponse.badRequest("Missing required params");
  }

  try {
    // Convert chainId to number or default to 1 (mainnet)
    const targetChainId = chainId ? parseInt(chainId) : 1;
    
    // Fetch assets, persist=false for read-only extension view
    
    const result = await WalletAssetsService.syncAssets(
        userId,
        walletId as string,
        address as string,
        targetChainId,
        false
    );

    return apiResponse.success(result);
  } catch (error) {
    logger.error("Failed to fetch assets", error);
    return apiResponse.internalError("Failed to fetch assets");
  }
}
