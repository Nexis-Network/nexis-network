import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  removeGuardianMember,
  updateGuardianMember,
} from "@/server/automation/service";

type RouteContext = {
  params: Promise<{ id: string; memberId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const body = await request.json();
      const updated = await updateGuardianMember(
        supabase,
        userId,
        params.id,
        params.memberId,
        body,
      );

      return cookieBridge.commit(apiResponse.success(updated));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("MEMBER_UPDATE_ERROR", error instanceof Error ? error.message : "Failed to update guardian member", 400),
      );
    }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      await removeGuardianMember(supabase, userId, params.id, params.memberId);
      return cookieBridge.commit(apiResponse.success({ success: true }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("MEMBER_REMOVE_ERROR", error instanceof Error ? error.message : "Failed to remove guardian member", 400),
      );
    }
  });
}
