import type {
  AutomationState as PreferenceAutomationState,
  AutonomousActionKey as PreferenceAutonomousActionKey,
} from "@/modules/chat/automation-preferences";
import type {
  SelectedWalletKind,
  SelectedWalletSelection,
} from "@/hooks/wallets/use-selected-wallet";

export type AutomationState = PreferenceAutomationState;
export type AutonomousActionKey = PreferenceAutonomousActionKey;

export type ComposerActionMenuTriggerVariant =
  | "default"
  | "compact"
  | "nexInstant";

export type ComposerChainOption = {
  id: number;
  name: string;
  testnet: boolean;
};

export type WalletOption = SelectedWalletSelection & {
  avatarSeed: string;
  typeLabel: string;
};

export type ExchangeConnectionPayload = {
  exchangeId: string;
  label: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isTestnet: boolean;
  permissions: { spot: boolean; futures: boolean; withdraw: boolean };
};

export const SOLANA_MAINNET_ID = 900001;
export const DEFAULT_EVM_CHAIN_ID = 8453;

export const walletKindLabelMap: Record<SelectedWalletKind, string> = {
  eoa: "EOA",
  cdp_evm_smart: "Nex Wallet (EVM)",
  cdp_solana_embedded: "Nex Wallet (SOL)",
  agentkit: "AgentKit Wallet",
};

export const toOptionalChainId = (
  value: number | string | null | undefined,
): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
