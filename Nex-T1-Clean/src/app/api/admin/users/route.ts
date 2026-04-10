import { connection, type NextRequest } from "next/server";

import { requireAdminToken } from "@/server/auth/admin-session";
import { nexFetch } from "@/server/api/nex-client";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";

export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("admin.users.list", async () => {
    let token: string;
    try {
      token = await requireAdminToken();
    } catch {
      return apiResponse.unauthorized("Admin session required");
    }

    const search = request.nextUrl.searchParams.toString();
    const path = `/api/v1/admin/users${search ? `?${search}` : ""}`;

    try {
        const res = await nexFetch(path, {
            method: "GET",
            bearer: token,
        });

        // If nexFetch returns a raw Response-like object (depending on implementation), handle status
        if (!res.ok) {
            // Forward upstream error
            const errorBody = await res.json().catch(() => ({ message: res.statusText }));
            return apiResponse.error("UPSTREAM_ERROR", errorBody.message || "Upstream error", res.status);
        }

        const data = await res.json();
        return apiResponse.success(data);
    } catch (error) {
        return apiResponse.internalError(error instanceof Error ? error.message : "Failed to fetch users");
    }
  });
}
