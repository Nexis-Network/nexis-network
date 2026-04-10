import { connection } from "next/server";

import { requireAdminToken } from "@/server/auth/admin-session";
import { nexFetch } from "@/server/api/nex-client";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  await connection();
  let token: string;
  try {
    token = await requireAdminToken();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userId } = await context.params;
  const res = await nexFetch(`/api/v1/admin/users/${userId}/prompts/export`, {
    method: "GET",
    bearer: token,
    headers: { Accept: "text/csv" },
  });

  const arrayBuffer = await res.arrayBuffer();
  const headers = new Headers();
  headers.set("Content-Type", res.headers.get("content-type") ?? "text/csv");
  const disposition = res.headers.get("content-disposition");
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }
  return new Response(arrayBuffer, {
    status: res.status,
    headers,
  });
}
