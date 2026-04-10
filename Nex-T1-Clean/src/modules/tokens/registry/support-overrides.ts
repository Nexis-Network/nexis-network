import type { TokenRegistryEntry } from "@/modules/tokens/types";

export const TOKEN_SUPPORT_OVERRIDE_ENTRIES: TokenRegistryEntry[] = [
  {
    chainId: 1,
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    symbol: "PEPE",
    name: "Pepe",
    decimals: 18,
    supportStatus: "unsupported",
    sources: ["registry"],
    tags: ["warning"],
  },
  {
    chainId: 8453,
    address: "0x1111111111111111111111111111111111111111",
    symbol: "BROKEN",
    name: "Broken Token",
    decimals: 18,
    supportStatus: "broken",
    sources: ["registry"],
    tags: ["warning"],
  },
  {
    chainId: 1,
    address: "0x0000000000000000000000000000000000000001",
    symbol: "BANNED",
    name: "Banned Token",
    decimals: 18,
    supportStatus: "banned",
    sources: ["registry"],
    tags: ["blocked"],
  },
];
