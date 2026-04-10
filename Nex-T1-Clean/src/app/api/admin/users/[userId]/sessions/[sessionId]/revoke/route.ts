import { requireAdminToken } from "@/server/auth/admin-session";
import { nexFetch } from "@/server/api/nex-client";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type RouteContext = {
  params: Promise<{
    userId: string;
    sessionId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  let token: string;
  try {
    token = await requireAdminToken();
  } catch {
    return new Response(JSON.stringify({ error: "Admin session required" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const { userId, sessionId } = await context.params;
  const res = await nexFetch(`/api/v1/admin/users/${userId}/sessions/${sessionId}/revoke`, {
    method: "POST",
    bearer: token,
  });

  const payload = await res.text();
  return new Response(payload, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
