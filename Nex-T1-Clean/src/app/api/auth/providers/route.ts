import { apiResponse } from "@/lib/api-platform";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { loadSupabaseOAuthProviders } from "@/server/auth/providers";

export async function GET() {
  const config = getSupabaseConfig();

  if (!config) {
    return apiResponse.serviceUnavailable("Supabase OAuth is not configured");
  }

  const providers = await loadSupabaseOAuthProviders();
  return apiResponse.success(providers);
}
