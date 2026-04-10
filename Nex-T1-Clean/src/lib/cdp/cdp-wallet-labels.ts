export type NexWalletPlatform = "evm" | "solana";

const NEX_SMART_ACCOUNT_LABEL = "Nex Smart Account";

const LEGACY_NEX_WALLET_LABELS = new Set(
  [
    "Nex Wallet",
    "Nex Wallet",
    "Nex Wallet",
    "Nex Wallet (EVM)",
    "Nex Wallet (SOL)",
  ].map((value) => value.toLowerCase()),
);

export function getNexSmartAccountLabel(): string {
  return NEX_SMART_ACCOUNT_LABEL;
}

export function normalizeNexWalletLabel(
  label: string | null | undefined,
): string | null {
  if (typeof label !== "string") {
    return null;
  }

  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }

  if (LEGACY_NEX_WALLET_LABELS.has(trimmed.toLowerCase())) {
    return NEX_SMART_ACCOUNT_LABEL;
  }

  return trimmed;
}
