import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  createDeveloperProjectForConsole,
  type DeveloperConsoleSupabaseClient,
} from "@/server/services/developer-api/console-service";

import { createApiProjectSchema } from "@/app/api/auth/api-project/create/route.schema";

export async function POST(request: Request) {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    const rawBody = await request.json().catch(() => null);
    const parsed = createApiProjectSchema.safeParse(rawBody);

    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.validationError(parsed.error));
    }

    const ownerType = parsed.data.ownerType;
    const ownerId =
      ownerType === "organization"
        ? parsed.data.organizationId ?? ""
        : userId;
    if (!ownerId) {
      return cookieBridge.commit(
        apiResponse.badRequest("Organization projects require a valid organization id."),
      );
    }

    const consoleSupabase = supabase as unknown as DeveloperConsoleSupabaseClient;
    const project = await createDeveloperProjectForConsole(consoleSupabase, {
      ownerType,
      ownerId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      hardCapUsd: parsed.data.hardCapUsd ?? null,
      softCapUsd: parsed.data.softCapUsd ?? null,
      overageEnabled: parsed.data.overageEnabled ?? true,
    });

    return cookieBridge.commit(apiResponse.created(project));
  });
}
