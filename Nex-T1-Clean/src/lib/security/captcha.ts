import { getErrorMessage } from "@/lib/utils/error";

type VerifyResult = { success: true } | { success: false; reason: string };

async function verifyTurnstile(token: string, remoteIp: string | null): Promise<VerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: true };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return { success: false, reason: (data["error-codes"] ?? []).join(",") || "turnstile_failed" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, reason: getErrorMessage(error, "turnstile_error") };
  }
}

async function verifyHCaptcha(token: string, remoteIp: string | null): Promise<VerifyResult> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) return { success: true };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch("https://hcaptcha.com/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return { success: false, reason: (data["error-codes"] ?? []).join(",") || "hcaptcha_failed" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, reason: getErrorMessage(error, "hcaptcha_error") };
  }
}

export async function verifyCaptcha(token: string | null | undefined, remoteIp: string | null): Promise<VerifyResult> {
  if (!token || token.trim().length === 0) {
    if (process.env.TURNSTILE_SECRET_KEY || process.env.HCAPTCHA_SECRET_KEY) {
      return { success: false, reason: "captcha_token_missing" };
    }
    return { success: true };
  }

  const turnstile = await verifyTurnstile(token, remoteIp);
  if (!turnstile.success) return turnstile;

  const hcaptcha = await verifyHCaptcha(token, remoteIp);
  if (!hcaptcha.success) return hcaptcha;

  return { success: true };
}
