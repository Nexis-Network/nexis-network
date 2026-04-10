import { apiResponse } from "@/lib/api-platform";
import { getMcpRegistry } from "@/lib/mcp/registry";

export async function GET() {
  const registry = await getMcpRegistry();

  if (!registry) {
    return apiResponse.internalError("Failed to fetch registry");
  }

  return apiResponse.success(registry);
}
