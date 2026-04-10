import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getErrorMessage } from "@/lib/utils/error";
import { apiResponse } from "@/lib/api-platform";
import { assertSupabaseConfig } from "@/lib/supabase/config";
import { createCompositeRateLimitKey, extractClientIP } from "@/lib/request-utils";
import { verifyCaptcha } from "@/lib/security/captcha";
import { checkRateLimit, otpRateLimit } from "@/server/security/rate-limit";

type PreparedOtp =
  | { ok: true; supabase: SupabaseClient; headers?: HeadersInit }
  | { ok: false; response: Response };

type PrepareOptions = {
  request: Request;
  routeKey: string;
  userId: string;
  captchaToken?: string | null;
};

export async function prepareOtpRequest({
  request,
  routeKey,
  userId,
  captchaToken,
}: PrepareOptions): Promise<PreparedOtp> {
  const clientIp = extractClientIP(request);
  const rateKey = createCompositeRateLimitKey({ clientIP: clientIp, route: routeKey, userId });
  const { success, headers } = await checkRateLimit(rateKey, otpRateLimit);
  if (!success) {
    return {
      ok: false,
      response: (() => {
        const res = apiResponse.error("RATE_LIMIT", "Too many requests. Please try again soon.", 429);
        if (headers) {
          Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v as string));
        }
        return res;
      })(),
    };
  }

  const captcha = await verifyCaptcha(captchaToken ?? null, clientIp);
  if (!captcha.success) {
    return {
      ok: false,
      response: apiResponse.badRequest(`Captcha validation failed. ${captcha.reason || ""}`),
    };
  }

  try {
    const { url, anonKey } = assertSupabaseConfig();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const key = serviceKey || anonKey;

    if (!key) {
      return {
        ok: false,
        response: apiResponse.internalError("Supabase keys are not configured."),
      };
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return { ok: true, supabase, headers };
  } catch (error) {
    return {
      ok: false,
      response: apiResponse.internalError(getErrorMessage(error, "Failed to initialize Supabase client.")),
    };
  }
}
