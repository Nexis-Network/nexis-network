"use client";

import { SendAssetModal } from "./actions/send-asset-modal";
import { ReceiveAssetModal } from "./actions/receive-asset-modal";
import { ExportKeyModal } from "./actions/export-key-modal";
import { CdpExportModal } from "@/components/wallets/cdp/cdp-export-modal";

import type { WalletRow } from "./lib/wallet-table-types";

interface WalletTableModalsProps {
  sendAssetOpen: boolean;
  onSendAssetOpenChange: (next: boolean) => void;

  receiveAssetOpen: boolean;
  onReceiveAssetOpenChange: (next: boolean) => void;

  exportKeyOpen: boolean;
  onExportKeyOpenChange: (next: boolean) => void;

  activeActionWallet: WalletRow | null;
}

export function WalletTableModals({
  sendAssetOpen,
  onSendAssetOpenChange,
  receiveAssetOpen,
  onReceiveAssetOpenChange,
  exportKeyOpen,
  onExportKeyOpenChange,
  activeActionWallet,
}: WalletTableModalsProps) {
  return (
    <>
      <SendAssetModal
        open={sendAssetOpen}
        onOpenChange={onSendAssetOpenChange}
        walletId={activeActionWallet?.id || ""}
        chainType={activeActionWallet?.platform ?? "evm"}
        provider={activeActionWallet?.provider || null}
      />

      <ReceiveAssetModal
        open={receiveAssetOpen}
        onOpenChange={onReceiveAssetOpenChange}
        address={activeActionWallet?.smartAccountAddress ?? activeActionWallet?.address ?? null}
        walletLabel={activeActionWallet?.label || ""}
      />

      {activeActionWallet?.sourceProvider === "cdp" && activeActionWallet.address ? (
        <CdpExportModal
          open={exportKeyOpen}
          onOpenChange={onExportKeyOpenChange}
          address={activeActionWallet.smartAccountAddress ?? activeActionWallet.address}
          chain={activeActionWallet.platform === "solana" ? "solana" : "evm"}
        />
      ) : (
        <ExportKeyModal
          open={exportKeyOpen}
          onOpenChange={onExportKeyOpenChange}
          walletId={activeActionWallet?.id || ""}
          provider={activeActionWallet?.sourceProvider || activeActionWallet?.provider || null}
          walletType={activeActionWallet?.type || ""}
        />
      )}
    </>
  );
}
