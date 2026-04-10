export type NativeBalance = { displayValue: string; symbol?: string } | null;

export type TokenBalanceEntry = {
  symbol?: string | null;
  name?: string | null;
  quantity?: { displayValue?: string | null } | null;
  value?: { displayValue?: string | null } | null;
};

export type NftEntry = {
  id?: string | number;
  name?: string | null;
  description?: string | null;
  tokenId?: string | null;
};

export type TransactionEntry = {
  hash?: string | null;
  from?: string | null;
  to?: string | null;
  status?: string | null;
  timestamp?: string | number | null;
  value?: { displayValue?: string | null; symbol?: string | null } | null;
};

export type ProvisionedWalletKind = "evm" | "hyperliquid" | "solana";

export type ProvisionedWallet = {
  id: string;
  kind: ProvisionedWalletKind;
  address: string;
  chainId?: number;
  cluster?: "mainnet" | "devnet";
  label: string;
  createdAt?: string;
};

export type ProvisionedWalletResponse = {
  wallets: ProvisionedWallet[];
};

