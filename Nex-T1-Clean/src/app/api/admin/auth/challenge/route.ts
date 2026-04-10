import { cookies } from "next/headers";

import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { nexFetch } from "@/server/api/nex-client";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export async function POST() {
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

  try {
    const res = await nexFetch("/api/v1/admin/auth/challenge", { method: "POST", bearer });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        typeof payload?.error === "string"
          ? payload.error
          : typeof payload?.detail === "string"
            ? payload.detail
            : `Admin enrollment endpoint returned ${res.status}`;
      return cookieBridge.commit(
        new Response(JSON.stringify({ error: detail }), {
          status: res.status,
          headers: JSON_HEADERS,
        }),
      );
    }

    return cookieBridge.commit(
      new Response(JSON.stringify(payload), {
        status: res.status,
        headers: JSON_HEADERS,
      }),
    );
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : "Admin challenge failed";
    return cookieBridge.commit(
      new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: JSON_HEADERS,
      }),
    );
  }
}
