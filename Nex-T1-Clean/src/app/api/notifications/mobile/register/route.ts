import { NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

const BodySchema = z.object({
  token: z.string().min(16),
  tokenType: z.enum(["expo", "fcm", "apns"]),
  platform: z.enum(["ios", "android"]),
});

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  try {
    const body = BodySchema.parse(await request.json());
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    const result = await supabase.from("device_push_tokens").upsert(
      {
        user_id: auth.session.user.id,
        token: body.token,
        token_type: body.tokenType,
        platform: body.platform,
        is_active: true,
        user_agent: request.headers.get("user-agent"),
        last_registered_at: now,
        deactivated_at: null,
      },
      { onConflict: "user_id,token" },
    );

    if (result.error) {
      return apiResponse.internalError(result.error.message || "mobile_register_failed");
    }

    return apiResponse.success({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }

    return apiResponse.internalError("mobile_register_failed");
  }
}
