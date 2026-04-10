import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { extractClientIP } from "@/lib/request-utils";
import { verifyCaptcha } from "@/lib/security/captcha";
import { buildHighRiskCookie, cookieNameHighRisk } from "@/server/security/high-risk";


export async function POST(request: Request) {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(bridge, { refreshSession: false, request });
  if (!context?.userId) {
    return apiResponse.unauthorized();
  }

  let body: Record<string, UntypedJson> = {};
  try {
    body = (await request.json()) as Record<string, UntypedJson>;
  } catch {
    /* ignore */
  }
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : null;
  const clientIp = extractClientIP(request);
  const captcha = await verifyCaptcha(captchaToken, clientIp);
  if (!captcha.success) {
    return apiResponse.badRequest(`Captcha failed: ${captcha.reason}`);
  }

  const targetPath = typeof body.path === "string" && body.path.trim().length > 0 ? body.path.trim() : "/";
  const cookie = buildHighRiskCookie(targetPath);
  if (!cookie) {
    return apiResponse.internalError("high_risk_secret_missing");
  }

  const response = apiResponse.success({ ok: true, path: targetPath });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return bridge.commit(response);
}

export async function DELETE() {
  const res = apiResponse.success({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(cookieNameHighRisk(), "", { path: "/", httpOnly: true, secure, sameSite: "lax", maxAge: 0 });
  return res;
}
