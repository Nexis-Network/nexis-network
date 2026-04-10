import { connection } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { checkMoralisHealth } from "@/server/moralis/health-check";

export async function GET() {
  await connection();

  const health = await checkMoralisHealth();

  if (health.status !== "healthy") {
    // Return service unavailable but with health details
    return apiResponse.error(
      "MORALIS_UNHEALTHY",
      "Moralis API Unhealthy",
      503,
      { health },
    );
  }

  return apiResponse.success(health);
}
