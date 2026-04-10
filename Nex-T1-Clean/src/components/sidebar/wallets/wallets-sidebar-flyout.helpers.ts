import type { WalletSnapshot } from "@/modules/wallets/profile";

import { mergeWalletSnapshotsWithCdp } from "./components/wallet-carousel-wallets";
import { isCdpWalletSnapshot, resolveWalletAssetType } from "./components/wallet-runtime-context";

export const HIDDEN_WALLET_IDS_STORAGE_KEY = "nex.wallets.sidebar.hiddenWalletIds.v1";

export function buildSidebarWallets(args: {
  walletsData: WalletSnapshot[] | undefined;
  eoaWalletSnapshot: WalletSnapshot | null;
  cdpEvmSnapshot: WalletSnapshot | null;
  cdpSolanaSnapshot: WalletSnapshot | null;
}): WalletSnapshot[] {
  const allDbWallets = args.walletsData ?? [];
  const connectedEoaInDb = args.eoaWalletSnapshot
    ? allDbWallets.find(
        (wallet) =>
          wallet.address?.toLowerCase() === args.eoaWalletSnapshot?.address?.toLowerCase(),
      )
    : null;

  const baseWallets = buildBaseSidebarWallets(
    allDbWallets,
    args.eoaWalletSnapshot,
    connectedEoaInDb ?? null,
  );
  const cdpCandidates = [args.cdpEvmSnapshot, args.cdpSolanaSnapshot].filter(
    (wallet): wallet is WalletSnapshot => wallet !== null,
  );

  return mergeWalletSnapshotsWithCdp(baseWallets, cdpCandidates);
}

function buildBaseSidebarWallets(
  wallets: WalletSnapshot[],
  eoaWalletSnapshot: WalletSnapshot | null,
  connectedEoaInDb: WalletSnapshot | null,
): WalletSnapshot[] {
  if (!eoaWalletSnapshot) {
    return [...wallets];
  }

  if (!connectedEoaInDb) {
    return [eoaWalletSnapshot, ...wallets];
  }

  const otherWallets = wallets.filter((wallet) => wallet.id !== connectedEoaInDb.id);
  return [connectedEoaInDb, ...otherWallets];
}

export function getWalletBalanceChain(wallet: WalletSnapshot | null): "evm" | "solana" {
  if (!wallet) return "evm";

  const provider = typeof wallet.provider === "string" ? wallet.provider.toLowerCase() : "";
  const metadataKind =
    typeof wallet.metadata?.kind === "string" ? wallet.metadata.kind.toLowerCase() : "";
  const isCdpWallet = provider === "cdp" || metadataKind === "cdp";
  if (!isCdpWallet) return "evm";

  if (metadataKind.includes("sol")) return "solana";
  if (wallet.address && !wallet.address.startsWith("0x")) return "solana";
  return "evm";
}

export function getSelectorWallets(wallets: WalletSnapshot[]): WalletSnapshot[] {
  const embeddedWallets = wallets.filter(
    (wallet) => wallet.type === "embedded" || isCdpWalletSnapshot(wallet),
  );
  const selectedWallets: WalletSnapshot[] = [];
  const seenWalletIds = new Set<string>();

  const addWallet = (wallet: WalletSnapshot | undefined) => {
    if (!wallet || seenWalletIds.has(wallet.id)) return;
    seenWalletIds.add(wallet.id);
    selectedWallets.push(wallet);
  };

  const eoaWallets = wallets.filter((wallet) => {
    const accountType =
      typeof wallet.metadata?.accountType === "string"
        ? wallet.metadata.accountType.toLowerCase()
        : "";

    return (
      !isCdpWalletSnapshot(wallet) &&
      (wallet.type === "external_evm" ||
        wallet.type === "external_connected" ||
        accountType === "eoa" ||
        wallet.metadata?.connected === true)
    );
  });

  addWallet(
    eoaWallets.find((wallet) => wallet.metadata?.connected === true || wallet.id.startsWith("eoa-")) ??
      eoaWallets[0],
  );
  addWallet(embeddedWallets.find((wallet) => resolveWalletAssetType(wallet) === "evm"));
  addWallet(embeddedWallets.find((wallet) => resolveWalletAssetType(wallet) === "solana"));

  return selectedWallets;
}

export function isWalletEvm(wallet: WalletSnapshot | null): boolean {
  if (!wallet) return false;
  if (wallet.type === "external_solana") return false;
  if (wallet.provider?.toLowerCase().includes("phantom")) return false;
  if (wallet.provider?.toLowerCase().includes("solflare")) return false;

  const kind = typeof wallet.metadata?.kind === "string" ? wallet.metadata.kind : "";
  if (kind === "solana" || kind === "stellar") return false;
  if (wallet.provider?.toLowerCase().includes("solana")) return false;
  if (wallet.provider?.toLowerCase().includes("stellar")) return false;

  return true;
}
