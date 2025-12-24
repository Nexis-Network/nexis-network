import "server-only";

import { verifyAuthToken, type VerifyAuthTokenResponse } from "@privy-io/node";

export type PrivyConfig = {
  appId: string;
  verificationKey: string;
};

export function getPrivyConfig(): PrivyConfig | null {
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY;

  if (!appId || !verificationKey) {
    return null;
  }

  return { appId, verificationKey };
}

export function isPrivyConfigured(): boolean {
  return getPrivyConfig() !== null;
}

export async function verifyPrivyAuthToken(token: string): Promise<VerifyAuthTokenResponse> {
  const config = getPrivyConfig();
  if (!config) {
    throw new Error("Privy is not configured");
  }

  return verifyAuthToken({
    auth_token: token,
    app_id: config.appId,
    verification_key: config.verificationKey,
  });
}
