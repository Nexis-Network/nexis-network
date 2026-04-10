import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";
import { recordWalletExportAudit } from "@/server/logging/audit-log";

const PayloadSchema = z.object({
  address: z.string().min(1, "address required"),
});

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return apiResponse.internalError("supabase_unconfigured");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return apiResponse.unauthorized("unauthorized");
  }

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return apiResponse.badRequest("invalid_request");
  }

  await recordWalletExportAudit({ userId: data.user.id, address: parsed.data.address });

  return apiResponse.success({ success: true });
}
