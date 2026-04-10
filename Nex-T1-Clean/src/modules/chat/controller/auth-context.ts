import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { isNonProductionTestMode } from "@/server/auth/test-mode";

export type CookieContainer =
  | ReadonlyRequestCookies
  | Record<string, string>
  | Map<string, string>
  | UntypedJson;

export type ControllerAuthContext = {
  userId?: string | null;
  accessToken?: string | null;
} | null;

export function readCookieValue(cookies: CookieContainer, name: string): string | null {
  if (!cookies) return null;

  if (
    cookies &&
    typeof cookies === "object" &&
    "get" in cookies &&
    typeof (cookies as { get?: unknown }).get === "function"
  ) {
    const value = (cookies as { get: (cookieName: string) => unknown }).get(name);
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "value" in value) {
      return (value as { value?: string }).value ?? null;
    }
  }

  if (cookies instanceof Map) {
    return cookies.get(name) ?? null;
  }

  if (typeof cookies === "object" && name in cookies) {
    return (cookies as Record<string, string>)[name];
  }

  return null;
}

export async function resolveControllerAuthContext(
  cookies: CookieContainer,
  request?: Request,
): Promise<ControllerAuthContext> {
  const cookieBridge = createCookieBridge(cookies as ReadonlyRequestCookies);
  const { context } = await resolveSupabaseContext(cookieBridge, {
    refreshSession: false,
    request,
  });
  if (context) {
    return context;
  }

  if (isNonProductionTestMode({ request })) {
    const userId =
      process.env.NEXT_PUBLIC_DEV_AUTH_USER_ID ??
      "00000000-0000-0000-0000-000000000000";

    return {
      userId,
      accessToken: "dev-mock-token",
    };
  }

  return null;
}
