import { apiResponse } from "@/lib/api-platform";
import { getSupabaseErrorMessage } from "@/lib/errors/supabase";
import { asJsonObject } from "@/lib/json";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return apiResponse.badRequest("Notification id is required");
  }

  const supabase = await createClient();
  if (!supabase) {
    return apiResponse.serviceUnavailable("Supabase is not configured");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiResponse.unauthorized();
  }

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("notifications")
    .select("id, user_id, metadata")
    .eq("id", id)
    .maybeSingle();

  if (!existing || String(existing.user_id) !== user.id) {
    return apiResponse.notFound("Notification not found");
  }

  const existingMetadata = asJsonObject(existing.metadata) ?? {};

  const { error } = await admin
    .from("notifications")
    .update({
      metadata: {
        ...existingMetadata,
        read: true,
        read_at: new Date().toISOString(),
      },
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return apiResponse.internalError(getSupabaseErrorMessage(error) ?? "Failed to update notification");
  }

  return apiResponse.success({ success: true });
}
