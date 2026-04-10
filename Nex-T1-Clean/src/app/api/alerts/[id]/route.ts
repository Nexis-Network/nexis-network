import { cookies } from "next/headers";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const UpdateAlertRuleSchema = z.object({
  name: z.string().min(1).optional(),
  channels: z.array(z.enum(["in_app", "push"])).min(1).optional(),
  cooldownMinutes: z.number().int().min(0).max(10080).optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context: authContext } = await resolveSupabaseContext(cookieBridge, { request });

  if (!authContext?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  try {
    const params = await context.params;
    const body = UpdateAlertRuleSchema.parse(await request.json());
    const supabase = await getSupabaseServerClient({ accessToken: authContext.accessToken });
    if (!supabase) {
      return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
    }

    const updatePayload = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.channels ? { channels: body.channels } : {}),
      ...(typeof body.cooldownMinutes === "number"
        ? { cooldown_minutes: body.cooldownMinutes }
        : {}),
      ...(body.severity ? { severity: body.severity } : {}),
      ...(typeof body.isActive === "boolean" ? { is_active: body.isActive } : {}),
    };

    const result = await supabase
      .from("alert_rules")
      .update(updatePayload)
      .eq("id", params.id)
      .eq("user_id", authContext.userId)
      .select("id,name,source,scope_type,scope_ref,rule_type,condition,channels,cooldown_minutes,severity,is_active,created_at,updated_at")
      .single();

    if (result.error) {
      return cookieBridge.commit(apiResponse.internalError(result.error.message));
    }

    return cookieBridge.commit(apiResponse.success({ rule: result.data }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return cookieBridge.commit(apiResponse.validationError(error));
    }

    return cookieBridge.commit(apiResponse.internalError("Failed to update alert"));
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context: authContext } = await resolveSupabaseContext(cookieBridge, { request });

  if (!authContext?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  const params = await context.params;
  const supabase = await getSupabaseServerClient({ accessToken: authContext.accessToken });
  if (!supabase) {
    return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
  }

  const result = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", params.id)
    .eq("user_id", authContext.userId);

  if (result.error) {
    return cookieBridge.commit(apiResponse.internalError(result.error.message));
  }

  return cookieBridge.commit(apiResponse.success({ success: true }));
}
