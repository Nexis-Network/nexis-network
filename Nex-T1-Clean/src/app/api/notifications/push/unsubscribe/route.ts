import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";


const BodySchema = z.object({
  endpoint: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  try {
    const body = BodySchema.parse(await req.json());

    const supabase = getSupabaseAdminClient();
    const q = supabase
      .from("push_subscriptions")
      .update({ is_active: false, disabled_at: new Date().toISOString() })
      .eq("user_id", auth.session.user.id);

    const res = body.endpoint ? await q.eq("endpoint", body.endpoint) : await q;

    if (res.error) {
      return apiResponse.internalError(res.error.message || "unsubscribe_failed");
    }

    return apiResponse.success({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }
    return apiResponse.internalError("unsubscribe_failed");
  }
}
