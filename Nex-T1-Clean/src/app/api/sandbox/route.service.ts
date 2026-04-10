import type { SandboxRequest } from "./route.schema";
import { createSandboxSession } from "@/modules/shared/artifacts/server/sandbox/create-sandbox-session";
import { type SupabaseAuthContext } from "@/server/auth/auth-context";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";

type SandboxSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createSupabaseServerClient>>
>;

export async function createSandboxRouteData(args: {
  clientIp: string;
  context: SupabaseAuthContext;
  request: SandboxRequest;
  supabase: SandboxSupabaseClient;
  userId: string;
}) {
  const e2bApiKey = process.env.E2B_API_KEY;
  if (!e2bApiKey) {
    return {
      ok: false as const,
      status: 503,
      code: "E2B_NOT_CONFIGURED",
      message: "E2B sandbox is not configured",
    };
  }

  return createSandboxSession({
    clientIp: args.clientIp,
    e2bApiKey,
    orgId: args.context.orgId ?? null,
    request: args.request,
    supabase: args.supabase,
    userId: args.userId,
  });
}
