import { apiResponse } from "@/lib/api-platform";
import { getSupabaseErrorMessage } from "@/lib/errors/supabase";
import { asJsonObject, getJsonBoolean } from "@/lib/json";
import { createClient } from "@/server/services/supabase/server";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

export async function POST() {
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
  const { data: rows, error } = await admin
    .from("notifications")
    .select("id, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return apiResponse.internalError(getSupabaseErrorMessage(error) ?? "Failed to load notifications");
  }

  const unread = (rows ?? []).filter((row) => {
    const metadata = asJsonObject(row.metadata);
    return getJsonBoolean(metadata, "read") !== true;
  });

  if (unread.length === 0) {
    return apiResponse.success({ success: true, updated: 0 });
  }

  const readAt = new Date().toISOString();

  for (const row of unread) {
    const metadata = asJsonObject(row.metadata) ?? {};

    const { error: updateError } = await admin
      .from("notifications")
      .update({
        metadata: {
          ...metadata,
          read: true,
          read_at: readAt,
        },
      })
      .eq("id", row.id)
      .eq("user_id", user.id);

    if (updateError) {
      return apiResponse.internalError(
        getSupabaseErrorMessage(updateError) ?? "Failed to mark notifications as read",
      );
    }
  }

  return apiResponse.success({ success: true, updated: unread.length });
}
