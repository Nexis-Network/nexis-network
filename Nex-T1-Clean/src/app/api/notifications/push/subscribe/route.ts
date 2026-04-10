import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";


const BodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(8),
    auth: z.string().min(8),
  }),
});

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  try {
    const body = BodySchema.parse(await req.json());

    const supabase = getSupabaseAdminClient();
    const userAgent = req.headers.get("user-agent");

    const upsert = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: auth.session.user.id,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          user_agent: userAgent,
          last_seen_at: new Date().toISOString(),
          is_active: true,
          disabled_at: null,
          fail_count: 0,
        },
        { onConflict: "user_id,endpoint" },
      );

    if (upsert.error) {
      return apiResponse.internalError(upsert.error.message || "subscribe_failed");
    }

    return apiResponse.success({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }
    return apiResponse.internalError("subscribe_failed");
  }
}
