import { CdpOnrampModal } from "@/components/wallets/cdp/cdp-onramp-modal";
import { CdpReceiveModal } from "@/components/wallets/cdp/cdp-receive-modal";
import { CdpSendModal } from "@/components/wallets/cdp/cdp-send-modal";
import { type HeaderEmbeddedWallet } from "./settings-header-wallet-switcher.helpers";

type SettingsHeaderWalletSwitcherModalsProps = {
  activeWallet: HeaderEmbeddedWallet;
  sendOpen: boolean;
  receiveOpen: boolean;
  buyOpen: boolean;
  onSendOpenChange: (open: boolean) => void;
  onReceiveOpenChange: (open: boolean) => void;
  onBuyOpenChange: (open: boolean) => void;
};

export function SettingsHeaderWalletSwitcherModals({
  activeWallet,
  sendOpen,
  receiveOpen,
  buyOpen,
  onSendOpenChange,
  onReceiveOpenChange,
  onBuyOpenChange,
}: SettingsHeaderWalletSwitcherModalsProps) {
  return (
    <>
      <CdpSendModal
        open={sendOpen}
        onOpenChange={onSendOpenChange}
        fromAddress={activeWallet.address}
        platform={activeWallet.platform}
        chainId={activeWallet.chainId ?? undefined}
      />

      <CdpReceiveModal
        open={receiveOpen}
        onOpenChange={onReceiveOpenChange}
        address={activeWallet.address}
        chain={activeWallet.platform}
      />

      {activeWallet.canBuy ? (
        <CdpOnrampModal
          open={buyOpen}
          onOpenChange={onBuyOpenChange}
          address={activeWallet.address}
          chainId={activeWallet.chainId ?? undefined}
        />
      ) : null}
    </>
  );
}
