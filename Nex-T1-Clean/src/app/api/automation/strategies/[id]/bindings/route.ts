import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  createStrategyBinding,
  listStrategyBindings,
} from "@/server/automation/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  await connection();
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const bindings = await listStrategyBindings(supabase, userId, params.id);
      return cookieBridge.commit(apiResponse.success({ items: bindings }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("BINDING_LIST_ERROR", error instanceof Error ? error.message : "Failed to load strategy bindings", 500),
      );
    }
  });
}

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const body = await request.json();
      const created = await createStrategyBinding(supabase, userId, params.id, body);
      return cookieBridge.commit(apiResponse.created(created));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("BINDING_CREATE_ERROR", error instanceof Error ? error.message : "Failed to create strategy binding", 400),
      );
    }
  });
}
