import { cookies } from "next/headers";

import { NEX_API_BASE } from "@/server/api/nex-client";
import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { composeUpstreamHeaders } from "@/server/security/forward-headers";
import { resolveSupabaseContext } from "@/server/auth/auth-context";

const isDevEnvironment = process.env.NODE_ENV !== "production";

function buildDevBootstrapPayload(kind: string | undefined) {
  const normalizedKind = kind === "smart" ? "smart" : kind === "embedded" ? "embedded" : "smart";
  const address =
    normalizedKind === "smart"
      ? "0xsandbox0000000000000000000000000000smart"
      : "0xsandbox000000000000000000000000embedded";

  return {
    ok: true,
    mock: true,
    wallet: {
      kind: normalizedKind,
      address,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function POST(req: Request) {
  const cookieBridge = createCookieBridge(await cookies());
  const { context } = await resolveSupabaseContext(cookieBridge, { request: req });
  const bearer = context?.accessToken ?? null;

  try {
    const composedHeaders = composeUpstreamHeaders({ cookieBridge, request: req, accessToken: bearer });
    const upstreamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...composedHeaders,
    };

    const bodyText = await req.text().catch(() => "");
    let parsedBody = null;
    if (bodyText && bodyText.trim().length > 0) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        parsedBody = null;
      }
    }

    const walletKind =
      parsedBody && typeof parsedBody === 'object' && 'kind' in parsedBody && typeof (parsedBody).kind === "string"
        ? ((parsedBody).kind as string)
        : undefined;

    const useDevFallback = isDevEnvironment && !bearer;
    if (useDevFallback) {
      return cookieBridge.commit(apiResponse.success(buildDevBootstrapPayload(walletKind)));
    }

    const upstream = await fetch(`${NEX_API_BASE}/api/v1/wallets/bootstrap`, {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyText && bodyText.trim().length > 0 ? bodyText : JSON.stringify({}),
      cache: "no-store",
    });

    const responseText = await upstream.text();
    let responseBody = {};
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = { message: responseText };
      }
    }

    if (!upstream.ok && isDevEnvironment && (upstream.status === 401 || upstream.status === 403 || upstream.status === 404)) {
      return cookieBridge.commit(apiResponse.success(buildDevBootstrapPayload(walletKind)));
    }

    const downstream = apiResponse.success(responseBody);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        downstream.headers.append("set-cookie", value);
      }
    });
    return cookieBridge.commit(downstream);
  } catch (error: UntypedJson) {
    if (isDevEnvironment) {
      return cookieBridge.commit(apiResponse.success(buildDevBootstrapPayload(undefined)));
    }
    return cookieBridge.commit(
      apiResponse.internalError(error instanceof Error ? error.message : "Wallet bootstrap failed"),
    );
  }
}
