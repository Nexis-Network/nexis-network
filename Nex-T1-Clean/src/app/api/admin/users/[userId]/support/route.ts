import { connection, type NextRequest } from "next/server";

import { forwardAdminUserRequest } from "@/server/api/helpers/admin-user-proxy";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  await connection();
  const { userId } = await context.params;
  const search = request.nextUrl.searchParams.toString();
  return forwardAdminUserRequest({
    userId,
    pathSuffix: "support",
    method: "GET",
    search,
  });
}
