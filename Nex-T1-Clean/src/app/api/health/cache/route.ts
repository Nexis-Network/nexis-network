import { apiResponse } from "@/lib/api-platform";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { isAdminUser } from "@/server/auth/admin";
import { getCacheStats } from "@/server/services/redis/cache-metrics";


export async function GET(request: Request) {
  const session = await getVerifiedSupabaseSession({ request });
  if (!session || !isAdminUser(session.user)) {
    return apiResponse.forbidden("forbidden");
  }

  const stats = getCacheStats();
  return apiResponse.success({
    status: "ok",
    generatedAt: new Date().toISOString(),
    stats,
  });
}
