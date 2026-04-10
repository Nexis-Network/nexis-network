import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";


export async function GET(request: NextRequest) {
  await connection();
  const secret = process.env.CRON_SECRET ?? "";
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return apiResponse.unauthorized("Unauthorized");
  }

  return apiResponse.success({ ok: true, timestamp: new Date().toISOString() });
}
