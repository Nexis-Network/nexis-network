import { apiResponse } from "@/lib/api-platform";
import { formatPhoneE164, PHONE_FORMAT_HELP } from "@/lib/auth/phone-format";
import { prepareOtpRequest } from "@/server/auth/otp-utils";
import { authLogger } from "@/server/logging/logger";


type PhoneOtpRequestBody = {
  phone: UntypedJson;
  inviteCode?: UntypedJson;
  invite_code?: UntypedJson;
  mode?: UntypedJson;
  shouldCreateUser?: UntypedJson;
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") return apiResponse.badRequest("Phone OTP payload must be a JSON object.");

  const body = payload as PhoneOtpRequestBody;
  const phoneValue = String(body.phone || "");
  if (!phoneValue) {
    return apiResponse.badRequest("Phone number is required.");
  }

  const phoneFormat = formatPhoneE164(phoneValue);
  const normalizedPhone = phoneFormat.formatted;
  if (!normalizedPhone) {
    return apiResponse.badRequest(PHONE_FORMAT_HELP);
  }

  const inviteCode = body.inviteCode ? String(body.inviteCode) : (body.invite_code ? String(body.invite_code) : undefined);
  // Default to allowing sign-up on OTP to prevent "Sign ups not allowed for OTP" when the user is new.
  const shouldCreateUser =
    body.shouldCreateUser === false
      ? false
      : true;

  const captchaToken = (body as Record<string, UntypedJson>).captchaToken ? String((body as Record<string, UntypedJson>).captchaToken) : undefined;
  const prepared = await prepareOtpRequest({
    request,
    routeKey: "otp:phone",
    userId: normalizedPhone,
    captchaToken,
  });
  if (!prepared.ok) {
    return prepared.response;
  }
  const { supabase, headers } = prepared;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        channel: "sms",
        shouldCreateUser,
        data: inviteCode ? { invite_code: inviteCode } : undefined,
      },
    });

    if (error) {
      throw error;
    }

    authLogger.info("phone_otp_requested", { phone: normalizedPhone.replace(/\d(?=\d{4})/g, "•") });
    const res = apiResponse.success({ ok: true, expires_in: 60 });
    if (headers) {
       Object.entries(headers).forEach(([k, v]) => {
           if (v) res.headers.set(k, v.toString());
       });
    }
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request verification code.";
    authLogger.warn("phone_otp_request_failed", { message });
    const res = apiResponse.error("OTP_REQUEST_FAILED", message, 502);
    if (headers) {
       Object.entries(headers).forEach(([k, v]) => {
           if (v) res.headers.set(k, v.toString());
       });
    }
    return res;
  }
}
