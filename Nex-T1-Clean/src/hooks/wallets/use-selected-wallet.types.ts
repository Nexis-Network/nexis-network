import type { ReactNode } from "react";

export type SelectedWalletKind =
  | "eoa"
  | "cdp_evm_smart"
  | "cdp_solana_embedded"
  | "agentkit";
export type SelectedWalletPlatform = "evm" | "solana";

export type SelectedWalletSelection = {
  id: string;
  kind: SelectedWalletKind;
  platform: SelectedWalletPlatform;
  address: string;
  label: string;
  chainId?: number | null;
  source?: "chat_composer";
  agentId?: string | null;
  agentName?: string | null;
};

export type SelectedWalletContextType = {
  selectedWallet: SelectedWalletSelection | null;
  selectedWalletAddress: string | null;
  setSelectedWallet: (wallet: SelectedWalletSelection | null) => void;
  setSelectedWalletAddress: (address: string | null) => void;
};

export type SelectedWalletProviderProps = {
  children: ReactNode;
};
