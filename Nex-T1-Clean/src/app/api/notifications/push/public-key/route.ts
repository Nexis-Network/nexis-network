import { type NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";

import { withAuth } from "@/server/security/with-auth";
import { getVapidConfig } from "@/server/notifications/config";


export async function GET(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const cfg = getVapidConfig();
  if (!cfg) {
    return apiResponse.serviceUnavailable("push_not_configured");
  }

  return apiResponse.success({ publicKey: cfg.publicKey });
}
