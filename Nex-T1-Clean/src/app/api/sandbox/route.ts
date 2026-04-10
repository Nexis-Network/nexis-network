import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  formatSandboxValidationIssues,
  parseSandboxRequest,
} from "./route.schema";
import { createSandboxRouteData } from "./route.service";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return withAuthedSupabase(async ({ userId, supabase, context, cookieBridge }) => {
    let body: UntypedJson;
    try {
      body = await req.json();
    } catch {
      return cookieBridge.commit(apiResponse.badRequest("Invalid JSON body"));
    }

    const parsed = parseSandboxRequest(body);
    if (!parsed.success) {
      return cookieBridge.commit(
        apiResponse.error(
          "VALIDATION_ERROR",
          "Validation failed",
          400,
          formatSandboxValidationIssues(parsed.error),
        ),
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const result = await createSandboxRouteData({
      clientIp,
      context,
      request: parsed.data,
      supabase,
      userId,
    });

    if (!result.ok) {
      const response =
        result.status === 503
          ? apiResponse.serviceUnavailable(result.message, result.code)
          : apiResponse.error(
              result.code,
              result.message,
              result.status,
              result.details,
            );

      Object.entries(result.headers ?? {}).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return cookieBridge.commit(response);
    }

    return cookieBridge.commit(apiResponse.success(result.data));
  });
}
