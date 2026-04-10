import { connection } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createClient as createServerSupabaseClient } from "@/server/services/supabase/server";


const UpdateSchema = z.object({
  chainId: z.number().int().positive(),
  enabled: z.boolean().optional(),
  resetIntervalSeconds: z.number().int().positive().optional(),
  policy: z.record(z.unknown()).optional(),
});

export async function GET(request: Request) {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });
  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized("unauthorized"));
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return cookieBridge.commit(apiResponse.serviceUnavailable("supabase_unconfigured"));
  }

  const { data, error } = await supabase
    .from("agent_policies")
    .select("chain_id,safe_address,enabled,reset_interval_seconds,policy,updated_at")
    .eq("user_id", context.userId)
    .order("chain_id", { ascending: true });

  return cookieBridge.commit(
    apiResponse.success({
      policies: data ?? [],
      error: error?.message ?? null,
      generatedAt: new Date().toISOString(),
    }),
  );
}

export async function PUT(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });
  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized("unauthorized"));
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return cookieBridge.commit(apiResponse.serviceUnavailable("supabase_unconfigured"));
  }

  const raw = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return cookieBridge.commit(apiResponse.badRequest("invalid_body"));
  }

  const patch: Record<string, UntypedJson> = {};
  if (typeof parsed.data.enabled === "boolean") patch.enabled = parsed.data.enabled;
  if (typeof parsed.data.resetIntervalSeconds === "number") patch.reset_interval_seconds = parsed.data.resetIntervalSeconds;
  if (parsed.data.policy) patch.policy = parsed.data.policy;

  const { error } = await supabase
    .from("agent_policies")
    .update(patch)
    .eq("user_id", context.userId)
    .eq("chain_id", parsed.data.chainId);

  if (error) {
    return cookieBridge.commit(apiResponse.error("UPDATE_FAILED", error.message, 500));
  }

  return cookieBridge.commit(apiResponse.success({ ok: true }));
}

