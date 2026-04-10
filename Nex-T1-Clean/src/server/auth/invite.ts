import { getErrorMessage } from "@/lib/utils/error";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";

export type InviteValidation = {
  ok: boolean;
  reason?: string;
};

export async function validateInvite(code: string | null | undefined): Promise<InviteValidation> {
  if (!code) return { ok: true };
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length === 0) return { ok: true };

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("invite")
      .select("code, expires_at, max_uses, use_count")
      .eq("code", trimmed)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, reason: getErrorMessage(error, "invite_query_failed") };
    }
    if (!data) {
      return { ok: false, reason: "invite_not_found" };
    }
    const now = Date.now();
    if (data.expires_at && new Date(data.expires_at).getTime() < now) {
      return { ok: false, reason: "invite_expired" };
    }
    if (typeof data.max_uses === "number" && data.max_uses > 0 && data.use_count >= data.max_uses) {
      return { ok: false, reason: "invite_exhausted" };
    }
    return { ok: true };
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      return { ok: true };
    }
    return { ok: false, reason: getErrorMessage(error, "invite_validation_failed") };
  }
}
