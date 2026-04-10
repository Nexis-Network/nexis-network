import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { updateOverrideEvent } from "@/server/automation/service";

type RouteContext = {
  params: Promise<{ id: string; eventId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const body = await request.json();
      const updated = await updateOverrideEvent(
        supabase,
        userId,
        params.id,
        params.eventId,
        body,
      );

      return cookieBridge.commit(apiResponse.success(updated));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("EVENT_UPDATE_ERROR", error instanceof Error ? error.message : "Failed to update override event", 400),
      );
    }
  });
}
