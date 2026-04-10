import { apiResponse } from "@/lib/api-platform";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";


import { logger } from '@/lib/logger';
export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return apiResponse.internalError("supabase_unconfigured");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return apiResponse.unauthorized("unauthorized");
  }

  const { data, error } = await supabase.rpc("rotate_user_invite_code");
  if (error) {
    logger.error("rotate_invite_code_failed", error);
    return apiResponse.internalError("rotate_invite_code_failed");
  }

  return apiResponse.success({ code: data });
}
