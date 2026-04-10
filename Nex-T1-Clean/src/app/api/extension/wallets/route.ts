import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getEnrichedUserWallets } from "@/server/wallets/user-wallets";


import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const auth = await withAuth(request);
  if (!auth.ok) {
    return auth.response;
  }
  if (!auth.session) {
    return apiResponse.unauthorized();
  }

  try {
    const wallets = await getEnrichedUserWallets(auth.session.user.id);
    return apiResponse.success({ wallets });
  } catch (error) {
    logger.error("Failed to fetch wallets", error);
    return apiResponse.internalError("Failed to fetch wallets");
  }
}
