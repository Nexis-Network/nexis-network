import { describe, expect, it } from "vitest";

import {
  getWalletRealtimeChannelName,
  getWalletRealtimeSharedKey,
  getWalletRealtimeTargets,
} from "./wallet-realtime";

describe("wallet realtime helpers", () => {
  it("builds stable shared keys and channel names", () => {
    expect(getWalletRealtimeSharedKey("user-123")).toBe(
      "wallet-realtime:user-123",
    );
    expect(getWalletRealtimeChannelName("user-123")).toBe("wallet:user-123");
  });

  it("subscribes to wallet account and wallet event changes for a user", () => {
    expect(getWalletRealtimeTargets("user-123")).toEqual([
      {
        event: "*",
        filter: "user_id=eq.user-123",
        schema: "public",
        table: "wallet_accounts",
      },
      {
        event: "*",
        filter: "user_id=eq.user-123",
        schema: "public",
        table: "wallet_events",
      },
    ]);
  });
});
