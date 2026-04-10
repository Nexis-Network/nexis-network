import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  addGuardianMember,
  listGuardianMembers,
} from "@/server/automation/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  await connection();
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const members = await listGuardianMembers(supabase, userId, params.id);
      return cookieBridge.commit(apiResponse.success({ items: members }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("MEMBER_LIST_ERROR", error instanceof Error ? error.message : "Failed to load guardian members", 500),
      );
    }
  });
}

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const body = await request.json();
      const created = await addGuardianMember(supabase, userId, params.id, body);
      return cookieBridge.commit(apiResponse.created(created));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("MEMBER_ADD_ERROR", error instanceof Error ? error.message : "Failed to add guardian member", 400),
      );
    }
  });
}
