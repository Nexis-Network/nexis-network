import { apiResponse } from "@/lib/api-platform";
import { getNetworkCapabilities } from "@/lib/networks/capabilities";

export async function GET() {
  return apiResponse.success({
    networks: getNetworkCapabilities(),
  });
}
