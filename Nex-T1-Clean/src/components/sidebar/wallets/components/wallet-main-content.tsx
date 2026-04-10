"use client";

import { WalletSnapshot } from "@/modules/wallets/profile";
import { WalletViewType } from "../wallet-right-panel";
import { WalletAssetsList } from "../wallet-assets-list";
import { WalletTransactionHistory } from "../panels/wallet-transaction-history";
import { WalletProtocolsPanel } from "../panels/wallet-protocols-panel";
import { WalletApprovalsPanel } from "../panels/wallet-approvals-panel";
import { WalletTab } from "./wallet-folder-tabs";

interface WalletMainContentProps {
  activeWallet: WalletSnapshot | null;
  leftTab: WalletTab;
  onViewChange: (view: WalletViewType, token?: WalletSnapshot["tokens"][number]) => void;
}

export function WalletMainContent({
  activeWallet,
  leftTab,
  onViewChange,
}: WalletMainContentProps) {
  if (!activeWallet) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        Select a wallet to view details
      </div>
    );
  }

  if (leftTab === "assets") {
    return <WalletAssetsList wallet={activeWallet} onViewChange={onViewChange} />;
  }

  if (leftTab === "activity") {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <WalletTransactionHistory wallet={activeWallet} />
      </div>
    );
  }

  if (leftTab === "protocols") {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <WalletProtocolsPanel wallet={activeWallet} />
      </div>
    );
  }

  if (leftTab === "approvals") {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <WalletApprovalsPanel wallet={activeWallet} />
      </div>
    );
  }

  return null;
}
