import { apiResponse } from "@/lib/api-platform";


export async function GET() {
  return apiResponse.success({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
