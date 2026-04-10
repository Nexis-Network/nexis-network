import { requireAdminToken } from "@/server/auth/admin-session";
import { nexFetch } from "@/server/api/nex-client";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export async function GET() {
  let token: string;
  try {
    token = await requireAdminToken();
  } catch {
    return new Response(JSON.stringify({ error: "Admin session required" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const res = await nexFetch("/api/v1/admin/analytics/overview", {
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
