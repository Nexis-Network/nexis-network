import { apiResponse } from "@/lib/api-platform";
import { authLogger } from "@/server/logging/logger";
import { checkRateLimit, otpRateLimit } from "@/server/security/rate-limit";
import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfig } from "@/lib/supabase/config";
import { extractClientIP, createCompositeRateLimitKey } from "@/lib/request-utils";
import { formatPhoneE164, PHONE_FORMAT_HELP } from "@/lib/auth/phone-format";


type PhoneOtpVerifyBody = {
  phone: UntypedJson;
  token: UntypedJson;
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return apiResponse.badRequest("Verification payload must be a JSON object.");

  const body = payload as PhoneOtpVerifyBody;
  const phoneValue = String(body.phone || "");
  const token = String(body.token || "");

  if (!phoneValue || !token) {
    return apiResponse.badRequest("Phone number and token are required.");
  }

  const phoneFormat = formatPhoneE164(phoneValue);
  const normalizedPhone = phoneFormat.formatted;
  if (!normalizedPhone) {
    return apiResponse.badRequest(PHONE_FORMAT_HELP);
  }
  const clientIp = extractClientIP(request);
  const rateKey = createCompositeRateLimitKey({ clientIP: clientIp, route: "otp:phone:verify", userId: normalizedPhone });
  const { success, headers } = await checkRateLimit(rateKey, otpRateLimit);
  if (!success) {
    const res = apiResponse.error("RATE_LIMIT_EXCEEDED", "Too many attempts. Please wait before trying again.", 429);
    if (headers) {
       Object.entries(headers).forEach(([k, v]) => {
           if (v) res.headers.set(k, v.toString());
       });
    }
    return res;
  }

  try {
    const { url, anonKey } = assertSupabaseConfig();
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: "sms",
    });

    if (error) {
      throw error;
    }

    authLogger.info("phone_otp_verified", { phone: normalizedPhone.replace(/\d(?=\d{4})/g, "•") });
    const res = apiResponse.success({
        ok: true,
        session: data?.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_in: data.session.expires_in,
            }
          : null,
        user: data?.user
          ? {
              id: data.user.id,
              phone: data.user.phone,
            }
          : null,
    });
    if (headers) {
        Object.entries(headers).forEach(([k, v]) => {
            if (v) res.headers.set(k, v.toString());
        });
    }
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid or expired verification code.";
    authLogger.warn("phone_otp_verify_failed", { message });
    const res = apiResponse.badRequest(message);
    if (headers) {
        Object.entries(headers).forEach(([k, v]) => {
            if (v) res.headers.set(k, v.toString());
        });
    }
    return res;
  }
}
