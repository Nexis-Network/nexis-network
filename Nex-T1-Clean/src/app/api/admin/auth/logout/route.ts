import { cookies } from "next/headers";

import { createCookieBridge, getCookieValue } from "@/server/auth/cookie-bridge";
import { nexFetch } from "@/server/api/nex-client";

const ADMIN_COOKIE = "nex_admin_token";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export async function POST() {
  const cookieBridge = createCookieBridge(await cookies());
  const adminToken = getCookieValue(cookieBridge, ADMIN_COOKIE);

  if (!adminToken) {
    return cookieBridge.commit(
      new Response(JSON.stringify({ revoked: true }), {
        status: 200,
        headers: JSON_HEADERS,
      }),
    );
  }

  try {
    const res = await nexFetch("/api/v1/admin/auth/logout", {
      method: "POST",
      bearer: adminToken,
    });
    const payload = await res.json().catch(() => ({}));

    cookieBridge.setAll([
      {
        name: ADMIN_COOKIE,
        value: "",
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        },
      },
    ]);

    return cookieBridge.commit(
      new Response(JSON.stringify(payload), {
        status: res.status,
        headers: JSON_HEADERS,
      }),
    );
  } catch (error: UntypedJson) {
    cookieBridge.setAll([
      {
        name: ADMIN_COOKIE,
        value: "",
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        },
      },
    ]);
    const message = error instanceof Error ? error.message : "Admin logout failed";
    return cookieBridge.commit(
      new Response(JSON.stringify({ revoked: true, error: message }), {
        status: 200,
        headers: JSON_HEADERS,
      }),
    );
  }
}
