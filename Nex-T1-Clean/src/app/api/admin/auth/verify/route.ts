import { cookies } from "next/headers";

import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { nexFetch } from "@/server/api/nex-client";
import { resolveSupabaseContext } from "@/server/auth/auth-context";

const ADMIN_COOKIE = "nex_admin_token";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type VerifyRequestBody = {
  code: string;
};

type VerifyResponsePayload = {
  token?: {
    access_token?: string;
    expires_at?: string | null;
  };
  [key: string]: UntypedJson;
};

export async function POST(request: Request) {
  const cookieBridge = createCookieBridge(await cookies());
  const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
  const bearer = context?.accessToken ?? null;

  if (!bearer) {
    return cookieBridge.commit(
      new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: JSON_HEADERS,
      }),
    );
  }

  let body: VerifyRequestBody = { code: "" };
  try {
    const parsed = (await request.json()) as Partial<VerifyRequestBody>;
    if (parsed && typeof parsed.code === "string") {
      body = { code: parsed.code };
    }
  } catch {
    // fallback to default body
  }

  try {
    const res = await nexFetch("/api/v1/admin/auth/verify", {
      method: "POST",
      bearer,
      body,
    });
    const payload = (await res.json().catch(() => ({}))) as VerifyResponsePayload;

    if (!res.ok) {
      const detail =
        typeof (payload as { error?: UntypedJson }).error === "string"
          ? (payload as { error: string }).error
          : typeof (payload as { detail?: UntypedJson }).detail === "string"
            ? (payload as { detail: string }).detail
            : `Admin verification endpoint returned ${res.status}`;

      return cookieBridge.commit(
        new Response(JSON.stringify({ error: detail }), {
          status: res.status,
          headers: JSON_HEADERS,
        }),
      );
    }

    const adminToken = payload?.token?.access_token;
    if (adminToken) {
      const expiresAt = payload?.token?.expires_at ? Date.parse(payload.token.expires_at) : undefined;
      const now = Date.now();
      let maxAge = 60 * 30;
      if (expiresAt && expiresAt > now) {
        maxAge = Math.max(60, Math.floor((expiresAt - now) / 1000));
      }

      cookieBridge.setAll([
        {
          name: ADMIN_COOKIE,
          value: adminToken,
          options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge,
          },
        },
      ]);
    }

    return cookieBridge.commit(
      new Response(JSON.stringify(payload), {
        status: res.status,
        headers: JSON_HEADERS,
      }),
    );
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : "Admin verification failed";
    return cookieBridge.commit(
      new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      }),
    );
  }
}
