import { connection } from "next/server";
import { cookies } from "next/headers";

import { createCookieBridge, getCookieValue } from "@/server/auth/cookie-bridge";
import { nexFetch } from "@/server/api/nex-client";

const ADMIN_COOKIE = "nex_admin_token";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export async function GET() {
  await connection();
  const cookieBridge = createCookieBridge(await cookies());
  const adminToken = getCookieValue(cookieBridge, ADMIN_COOKIE);

  if (!adminToken) {
    return cookieBridge.commit(
      new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: JSON_HEADERS,
      }),
    );
  }

  try {
    const res = await nexFetch("/api/v1/admin/auth/status", {
      method: "GET",
      bearer: adminToken,
    });
    const payload = await res.json().catch(() => ({}));

    return cookieBridge.commit(
      new Response(JSON.stringify(payload), {
        status: res.status,
        headers: JSON_HEADERS,
      }),
    );
  } catch (error: UntypedJson) {
    const message = error instanceof Error ? error.message : "Admin status failed";
    return cookieBridge.commit(
      new Response(JSON.stringify({ authenticated: false, error: message }), {
        status: 200,
        headers: JSON_HEADERS,
      }),
    );
  }
}
