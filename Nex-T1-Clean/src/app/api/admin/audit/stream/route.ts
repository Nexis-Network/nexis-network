import { requireAdminToken } from "@/server/auth/admin-session";
import { nexFetch } from "@/server/api/nex-client";

export async function GET() {
  let token: string;
  try {
    token = await requireAdminToken();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const upstream = await nexFetch("/api/v1/admin/audit/stream", {
    method: "GET",
    bearer: token,
    stream: true,
  });

  if (!upstream.body) {
    return new Response("", { status: upstream.status });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") ?? "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  headers.set("Connection", "keep-alive");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
