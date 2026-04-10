export type WalletRealtimeTarget = {
  event: "*";
  filter: string;
  schema: "public";
  table: "wallet_accounts" | "wallet_events";
};

export function getWalletRealtimeSharedKey(userId: string): string {
  return `wallet-realtime:${userId}`;
}

export function getWalletRealtimeChannelName(userId: string): string {
  return `wallet:${userId}`;
}

export function getWalletRealtimeTargets(userId: string): WalletRealtimeTarget[] {
  const filter = `user_id=eq.${userId}`;

  return [
    {
      event: "*",
      filter,
      schema: "public",
      table: "wallet_accounts",
    },
    {
      event: "*",
      filter,
      schema: "public",
      table: "wallet_events",
    },
  ];
}
