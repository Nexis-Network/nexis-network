import "server-only";

import crypto from "crypto";
import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, PRIVY_COOKIE_NAME } from "@/lib/auth/constants";
import { isPrivyConfigured, verifyPrivyAuthToken } from "@/lib/server/privy";

export type RequestIdentity = {
  id: string;
  method: "privy" | "api-key";
};

export async function getRequestIdentity(request: NextRequest): Promise<RequestIdentity | null> {
  const privyToken = request.cookies.get(PRIVY_COOKIE_NAME)?.value;
  if (privyToken && isPrivyConfigured()) {
    const claims = await verifyPrivyAuthToken(privyToken);
    return { id: claims.user_id, method: "privy" };
  }

  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (apiKey) {
    const digest = crypto.createHash("sha256").update(apiKey).digest("hex");
    return { id: `api_${digest.slice(0, 16)}`, method: "api-key" };
  }

  return null;
}
