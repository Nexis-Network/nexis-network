import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  deleteStrategyBinding,
  updateStrategyBinding,
} from "@/server/automation/service";

type RouteContext = {
  params: Promise<{ id: string; bindingId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const body = await request.json();
      const updated = await updateStrategyBinding(
        supabase,
        userId,
        params.id,
        params.bindingId,
        body,
      );

      return cookieBridge.commit(apiResponse.success(updated));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("BINDING_UPDATE_ERROR", error instanceof Error ? error.message : "Failed to update strategy binding", 400),
      );
    }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      await deleteStrategyBinding(supabase, userId, params.id, params.bindingId);
      return cookieBridge.commit(apiResponse.success({ success: true }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("BINDING_REMOVE_ERROR", error instanceof Error ? error.message : "Failed to remove strategy binding", 400),
      );
    }
  });
}
