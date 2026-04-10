import { forwardAdminUserRequest } from "@/server/api/helpers/admin-user-proxy";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  let body: UntypedJson;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { userId } = await context.params;
  return forwardAdminUserRequest({
    userId,
    pathSuffix: "role",
    method: "PATCH",
    body,
  });
}
