import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";


const QuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const ALLOWED_STATUSES = new Set(["proposed", "approved", "rejected", "executed", "failed", "expired"]);

export async function GET(req: NextRequest) {
  await connection();
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized("unauthorized");

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return apiResponse.badRequest("invalid_query");
  }

  const statuses = (parsed.data.status ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => ALLOWED_STATUSES.has(s));

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("safe_tx_requests")
    .select("id,chain_id,safe_address,to_address,value_wei,data,operation,nonce,safe_tx_hash,created_by,status,requires_mfa,created_at,updated_at,execution_tx_hash,last_error")
    .eq("user_id", auth.session.user.id)
    .order("created_at", { ascending: false })
    .limit(parsed.data.limit);

  if (statuses.length) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) {
    return apiResponse.internalError("safe_tx_requests_list_failed");
  }

  return apiResponse.success({ items: data ?? [] });
}
