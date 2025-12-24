import "server-only";

import { PrivyClient } from "@privy-io/node";

type PrivyAdminConfig = {
  appId: string;
  appSecret: string;
};

function getPrivyAdminConfig(): PrivyAdminConfig | null {
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) return null;

  return { appId, appSecret };
}

export function getPrivyAdminClient() {
  const config = getPrivyAdminConfig();
  if (!config) return null;
  return new PrivyClient({
    appId: config.appId,
    appSecret: config.appSecret,
  });
}
