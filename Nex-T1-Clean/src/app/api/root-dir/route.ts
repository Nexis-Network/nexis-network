import { connection, type NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";

import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { isAdminUser } from "@/server/auth/admin";


import { logger } from '@/lib/logger';
export async function GET(request: NextRequest) {
  await connection();
  logger.warn("[DEPRECATION] /api/root-dir was accessed", {
    timestamp: new Date().toISOString(),
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
  });

  const session = await getVerifiedSupabaseSession({ request });
  if (!session || !isAdminUser(session.user)) {
    return apiResponse.forbidden("forbidden");
  }

  const response = apiResponse.success({ root: process.cwd() });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

