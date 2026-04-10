import { cookies } from "next/headers";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

const CreateAlertRuleSchema = z.object({
  name: z.string().min(1),
  source: z.literal("watchlist"),
  scopeType: z.literal("watchlist_item"),
  scopeRef: z.string().uuid().or(z.string().min(1)),
  ruleType: z.enum(["price_percent", "volume_percent"]),
  condition: z.object({
    direction: z.enum(["above", "below"]),
    thresholdPercent: z.number().positive(),
  }),
  channels: z.array(z.enum(["in_app", "push"])).min(1).default(["in_app"]),
  cooldownMinutes: z.number().int().min(0).max(10080).default(30),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
});

export async function GET(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });

  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  const supabase = await getSupabaseServerClient({ accessToken: context.accessToken });
  if (!supabase) {
    return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0;

  const { data, error } = await supabase
    .from("alert_rules")
    .select("id,name,source,scope_type,scope_ref,rule_type,condition,channels,cooldown_minutes,severity,is_active,created_at,updated_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    return cookieBridge.commit(apiResponse.internalError(error.message));
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return cookieBridge.commit(
    apiResponse.success({
      items,
      page: {
        offset,
        limit,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
    }),
  );
}

export async function POST(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });

  if (!context?.userId) {
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  try {
    const body = CreateAlertRuleSchema.parse(await request.json());
    const supabase = await getSupabaseServerClient({ accessToken: context.accessToken });
    if (!supabase) {
      return cookieBridge.commit(apiResponse.serviceUnavailable("Supabase unavailable"));
    }

    const watchlistItem = await supabase
      .from("watchlist_items")
      .select("id, watchlists!inner(user_id)")
      .eq("id", body.scopeRef)
      .eq("watchlists.user_id", context.userId)
      .maybeSingle();

    if (watchlistItem.error) {
      return cookieBridge.commit(apiResponse.internalError(watchlistItem.error.message));
    }
    if (!watchlistItem.data?.id) {
      return cookieBridge.commit(apiResponse.notFound("Watchlist item not found"));
    }

    const insert = await supabase
      .from("alert_rules")
      .insert({
        user_id: context.userId,
        name: body.name,
        source: body.source,
        scope_type: body.scopeType,
        scope_ref: body.scopeRef,
        rule_type: body.ruleType,
        condition: body.condition,
        channels: body.channels,
        cooldown_minutes: body.cooldownMinutes,
        severity: body.severity,
        is_active: true,
      })
      .select("id,name,source,scope_type,scope_ref,rule_type,condition,channels,cooldown_minutes,severity,is_active,created_at,updated_at")
      .single();

    if (insert.error) {
      if (String(insert.error.code) === "23505") {
        return cookieBridge.commit(
          apiResponse.error("CONFLICT", "An alert for this watchlist item and rule already exists", 409),
        );
      }
      return cookieBridge.commit(apiResponse.internalError(insert.error.message));
    }

    return cookieBridge.commit(apiResponse.created({ rule: insert.data }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return cookieBridge.commit(apiResponse.validationError(error));
    }

    return cookieBridge.commit(apiResponse.internalError("Failed to create alert"));
  }
}
