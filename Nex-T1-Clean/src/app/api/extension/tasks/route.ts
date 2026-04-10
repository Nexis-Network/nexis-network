import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { listSchedules } from "@/server/services/aws/scheduler";


export async function GET(request: Request) {
  const auth = await withAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const schedules = await listSchedules();

    
    return apiResponse.success({ schedules });
  } catch {
    // Suppress error and return empty list for extension/local compatibility
    return apiResponse.success({ schedules: [] });
  }
}

