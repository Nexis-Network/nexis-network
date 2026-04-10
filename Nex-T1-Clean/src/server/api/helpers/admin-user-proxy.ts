import { nexFetch, type HttpMethod } from "@/server/api/nex-client";
import { requireAdminToken } from "@/server/auth/admin-session";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type ForwardOptions = {
  userId: string;
  pathSuffix: string;
  method: HttpMethod;
  body?: UntypedJson;
  search?: string;
};

export async function forwardAdminUserRequest({
  userId,
  pathSuffix,
  method,
  body,
  search,
}: ForwardOptions): Promise<Response> {
  let token: string;
  try {
    token = await requireAdminToken();
  } catch {
    return new Response(JSON.stringify({ error: "Admin session required" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const path = `/api/v1/admin/users/${userId}/${pathSuffix}${search ? `?${search}` : ""}`;
  const res = await nexFetch(path, {
    method,
    bearer: token,
    body,
  });

  const payload = await res.text();
  return new Response(payload, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
