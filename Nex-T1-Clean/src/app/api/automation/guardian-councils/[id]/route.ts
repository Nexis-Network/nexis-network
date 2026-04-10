import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  deleteGuardianCouncil,
  getGuardianCouncil,
  updateGuardianCouncil,
} from "@/server/automation/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  await connection();
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const council = await getGuardianCouncil(supabase, userId, params.id);
      return cookieBridge.commit(apiResponse.success(council));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("COUNCIL_LOAD_ERROR", error instanceof Error ? error.message : "Failed to load guardian council", 404),
      );
    }
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const body = await request.json();
      const updated = await updateGuardianCouncil(supabase, userId, params.id, body);
      return cookieBridge.commit(apiResponse.success(updated));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("COUNCIL_UPDATE_ERROR", error instanceof Error ? error.message : "Failed to update guardian council", 400),
      );
    }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      await deleteGuardianCouncil(supabase, userId, params.id);
      return cookieBridge.commit(apiResponse.success({ success: true }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("COUNCIL_DELETE_ERROR", error instanceof Error ? error.message : "Failed to delete guardian council", 400),
      );
    }
  });
}
