import { connection } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  anchorAutomationStrategy,
  deactivateAutomationStrategy,
  getAutomationStrategy,
  updateAutomationStrategy,
} from "@/server/automation/service";
import { anchorAutomationStrategyInputSchema } from "@/server/automation/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  await connection();
  const { id } = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const strategy = await getAutomationStrategy(supabase, userId, id);
      return cookieBridge.commit(apiResponse.success(strategy));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("STRATEGY_LOAD_ERROR", error instanceof Error ? error.message : "Failed to load strategy", 404),
      );
    }
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
    const payload = await request.json();
    let result;

    if (payload && typeof payload === "object" && "anchor" in payload) {
      const parsedAnchor = anchorAutomationStrategyInputSchema.safeParse(
        (payload as Record<string, UntypedJson>).anchor,
      );

      if (!parsedAnchor.success) {
        return cookieBridge.commit(
          apiResponse.badRequest(
            `Invalid anchor payload: ${JSON.stringify(parsedAnchor.error.issues)}`
          ),
        );
      }

      result = await anchorAutomationStrategy(supabase, userId, id, parsedAnchor.data);
    } else {
      result = await updateAutomationStrategy(supabase, userId, id, payload);
    }

    return cookieBridge.commit(apiResponse.success(result));
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.error("STRATEGY_UPDATE_ERROR", error instanceof Error ? error.message : "Failed to update strategy", 400),
    );
  }
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const strategy = await deactivateAutomationStrategy(supabase, userId, id);
      return cookieBridge.commit(apiResponse.success(strategy));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("STRATEGY_DEACTIVATE_ERROR", error instanceof Error ? error.message : "Failed to deactivate strategy", 400),
      );
    }
  });
}
