import { apiResponse } from "@/lib/api-platform";
import { assertRedisHealthy, isRedisConfigured } from "@/server/services/redis";


export async function GET() {
  try {
    await assertRedisHealthy();
    return apiResponse.success({ status: "ok", configured: isRedisConfigured });
  } catch (error) {
    return apiResponse.serviceUnavailable(
      error instanceof Error ? error.message : "Redis health check failed"
    );
  }
}
