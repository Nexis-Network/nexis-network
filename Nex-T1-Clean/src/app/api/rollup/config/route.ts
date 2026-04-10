import { apiResponse } from "@/lib/api-platform";
import { getNztRollupConfig, getNztRollupCapability } from "@/lib/networks/capabilities";

export async function GET() {
  return apiResponse.success({
    ...getNztRollupConfig(),
    capability: getNztRollupCapability(),
  });
}
