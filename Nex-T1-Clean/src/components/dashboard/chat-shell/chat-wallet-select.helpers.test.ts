import { describe, expect, it } from "vitest";

import type { WalletPortfolio } from "@/lib/user/profile";
import type { SelectedWalletSelection } from "../../../hooks/wallets/use-selected-wallet.types";

import {
  buildChatEmbeddedWalletLanes,
  resolveActiveChatEmbeddedWalletLane,
} from "./chat-wallet-select.helpers";

const wallets: WalletPortfolio[] = [
  {
    walletId: "wallet-1",
    walletType: "embedded",
    topAssets: [],
    topChains: [],
    address: "0x1111111111111111111111111111111111111111",
    label: "Primary EVM",
  },
];

describe("chat wallet select helpers", () => {
  it("builds the two embedded lanes with availability state", () => {
    const lanes = buildChatEmbeddedWalletLanes({
      evmAddress: "0x1111111111111111111111111111111111111111",
      solanaAddress: "So11111111111111111111111111111111111111112",
      selectedWallet: null,
      wallets,
    });

    expect(lanes).toHaveLength(2);
    expect(lanes[0]?.label).toBe("Embedded EVM");
    expect(lanes[0]?.disabled).toBe(false);
    expect(lanes[1]?.label).toBe("Embedded Solana");
    expect(lanes[1]?.disabled).toBe(false);
    expect(lanes[1]?.details).toContain("Solana");
  });

  it("falls back to the first available embedded lane when the current selection is external", () => {
    const selectedWallet: SelectedWalletSelection = {
      id: "eoa-1",
      kind: "eoa",
      platform: "evm",
      address: "0x9999999999999999999999999999999999999999",
      label: "EOA (EVM)",
      chainId: 1,
      source: "chat_composer",
    };

    const lanes = buildChatEmbeddedWalletLanes({
      evmAddress: "0x1111111111111111111111111111111111111111",
      solanaAddress: null,
      selectedWallet,
      wallets,
    });
    const activeLane = resolveActiveChatEmbeddedWalletLane(lanes, selectedWallet);

    expect(activeLane?.id).toBe("embedded-evm");
    expect(lanes[1]?.disabled).toBe(true);
  });
});
