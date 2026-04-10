import type { TokenRegistryEntry } from "@/modules/tokens/types";
import { ETHEREUM_SOLANA_REGISTRY } from "@/modules/tokens/registry/entries/ethereum-solana";
import { EVM_NETWORK_REGISTRY } from "@/modules/tokens/registry/entries/evm-networks";

export const TOKEN_REGISTRY_VERSION = "2026-03-12-v2";

export const DEFAULT_TOKEN_REGISTRY: TokenRegistryEntry[] = [
  ...ETHEREUM_SOLANA_REGISTRY,
  ...EVM_NETWORK_REGISTRY,
];
