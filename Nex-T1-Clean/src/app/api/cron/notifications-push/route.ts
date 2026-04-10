import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";

import { catchupWalletEventNotifications } from "@/server/notifications/catchup";
import { dispatchQueuedNotifications } from "@/server/notifications/dispatch";


export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("cron.notifications.push", async () => {
    const secret = process.env.CRON_SECRET ?? "";
    const authHeader = request.headers.get("authorization");

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return apiResponse.unauthorized("Unauthorized");
    }

    const catchup = await catchupWalletEventNotifications();
    const dispatched = await dispatchQueuedNotifications();

    return apiResponse.success({ ok: true, catchup, dispatched, timestamp: new Date().toISOString() });
  });
}
