import { connection, NextRequest } from "next/server";

import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { getSafeTxRequestForUser } from "@/server/services/safe/tx-requests";


export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const { id } = await ctx.params;
  const requestId = String(id ?? "").trim();
  if (!requestId) return apiResponse.badRequest("Missing request ID");

  const row = await getSafeTxRequestForUser({ userId: auth.session.user.id, requestId });
  if (!row) return apiResponse.notFound("Request not found");

  return apiResponse.success({ request: row });
}
