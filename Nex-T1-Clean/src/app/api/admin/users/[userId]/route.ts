import { connection, type NextRequest } from "next/server";

import { requireAdminToken } from "@/server/auth/admin-session";
import { nexFetch } from "@/server/api/nex-client";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await connection();
  let token: string;
  try {
    token = await requireAdminToken();
  } catch {
    return new Response(JSON.stringify({ error: "Admin session required" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const { userId } = await context.params;
  const res = await nexFetch(`/api/v1/admin/users/${userId}`, {
    method: "GET",
    bearer: token,
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
