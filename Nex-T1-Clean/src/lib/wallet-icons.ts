const DEFAULT_WALLET_ICON = "/icons/wallet-icons/core-wallet.svg";

const WALLET_ICON_MAP: Record<string, string> = {
  "agent wallet": DEFAULT_WALLET_ICON,
  "agent-generated": DEFAULT_WALLET_ICON,
  "agent_generated": DEFAULT_WALLET_ICON,
  "coinbase wallet": "/assets/wallet-logos/Coinbase.svg",
  coinbase: "/assets/wallet-logos/Coinbase.svg",
  core: DEFAULT_WALLET_ICON,
  ledger: "/assets/wallet-logos/ledger.svg",
  "ledger live": "/assets/wallet-logos/ledger.svg",
  metamask: "/assets/wallet-logos/Metamask.svg",
  "meta mask": "/assets/wallet-logos/Metamask.svg",
  binance: "/assets/wallet-logos/Binance.svg",
  "binance wallet": "/assets/wallet-logos/Binance.svg",
  phantom: "/assets/wallet-logos/phantom.svg",
  solflare: "/assets/wallet-logos/Solflare.svg",
  rabby: "/icons/wallet-icons/rabby-wallet.svg",
  cdp: "/assets/wallet-logos/Coinbase.svg",
  "cdp wallet": "/assets/wallet-logos/Coinbase.svg",
  "cdp embedded": "/assets/wallet-logos/Coinbase.svg",
  "cdp smart account": "/assets/wallet-logos/Coinbase.svg",
  safe: "/assets/wallet-logos/Safe-Wallet.svg",
  "safe wallet": "/assets/wallet-logos/Safe-Wallet.svg",
  safepal: "/assets/wallet-logos/SafePal.svg",
  "safe pal": "/assets/wallet-logos/SafePal.svg",
  trust: "/assets/wallet-logos/TrustWallet.svg",
  "trust wallet": "/assets/wallet-logos/TrustWallet.svg",
  walletconnect: "/assets/wallet-logos/WalletConnect.svg",
  "wallet connect": "/assets/wallet-logos/WalletConnect.svg",
  backpack: "/assets/wallet-logos/backpack.svg",
  "backpack wallet": "/assets/wallet-logos/backpack.svg",
};

type WalletDescriptor = {
  provider?: string | null;
  walletType?: string | null;
};

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function getWalletIcon(
  descriptor: WalletDescriptor | string | null | undefined,
  options?: { fallback?: string },
) {
  const fallback = options?.fallback ?? DEFAULT_WALLET_ICON;

  if (!descriptor) {
    return fallback;
  }

  if (typeof descriptor === "string") {
    const key = normalizeKey(descriptor);
    return WALLET_ICON_MAP[key] ?? fallback;
  }

  const providerKey = normalizeKey(descriptor.provider ?? "");
  if (providerKey) {
    const mappedProvider = WALLET_ICON_MAP[providerKey];
    if (mappedProvider) {
      return mappedProvider;
    }
  }

  const typeKey = normalizeKey(descriptor.walletType ?? "");
  if (typeKey) {
    const mappedType = WALLET_ICON_MAP[typeKey];
    if (mappedType) {
      return mappedType;
    }
  }

  return fallback;
}

export function getDefaultWalletIcon() {
  return DEFAULT_WALLET_ICON;
}
