import { NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

const BodySchema = z.object({
  token: z.string().min(16),
});

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  try {
    const body = BodySchema.parse(await request.json());
    const now = new Date().toISOString();

    const result = await getSupabaseAdminClient()
      .from("device_push_tokens")
      .update({
        is_active: false,
        deactivated_at: now,
      })
      .eq("user_id", auth.session.user.id)
      .eq("token", body.token);

    if (result.error) {
      return apiResponse.internalError(result.error.message || "mobile_unregister_failed");
    }

    return apiResponse.success({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }

    return apiResponse.internalError("mobile_unregister_failed");
  }
}
