"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowLeftRight, CreditCard, Send } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/components/providers/locale-provider";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { useSelectedWallet } from "@/hooks/wallets/use-selected-wallet";
import { getSettingsWalletSwitcherCopy } from "@/modules/settings/i18n";
import { WalletActionButton } from "./settings-header-wallet-action-button";
import {
  buildEmbeddedWallets,
  type HeaderEmbeddedWallet,
} from "./settings-header-wallet-switcher.helpers";
import { SettingsHeaderWalletSwitcherMenu } from "./settings-header-wallet-switcher-menu";
import { SettingsHeaderWalletSwitcherModals } from "./settings-header-wallet-switcher-modals";

export function SettingsHeaderWalletSwitcher() {
  const t = useTranslations("settingsNav");
  const copy = getSettingsWalletSwitcherCopy(t);
  const router = useRouter();
  const { data: profile } = useProfileAggregate();
  const profileWallets = useMemo(
    () => (Array.isArray(profile?.wallets) ? profile.wallets : []),
    [profile?.wallets],
  );
  const cdpWallets = useResolvedCdpWallets({
    fallbackWallets: profileWallets,
  });
  const { selectedWallet, setSelectedWallet } = useSelectedWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const embeddedWallets = useMemo(
    () =>
      buildEmbeddedWallets({
        profileWallets,
        evmAddress: cdpWallets.evmAddress,
        solanaAddress: cdpWallets.solanaAddress,
        copy,
        selectedWallet,
      }),
    [copy, profileWallets, cdpWallets.evmAddress, cdpWallets.solanaAddress, selectedWallet],
  );

  useEffect(() => {
    if (embeddedWallets.length === 0) return;

    const selectedEmbeddedWallet = selectedWallet
      ? embeddedWallets.find(
          (wallet) => wallet.address.toLowerCase() === selectedWallet.address.toLowerCase(),
        )
      : null;

    if (!selectedEmbeddedWallet) {
      setSelectedWallet(embeddedWallets[0].selection);
    }
  }, [embeddedWallets, selectedWallet, setSelectedWallet]);

  const activeWallet = useMemo(() => {
    if (embeddedWallets.length === 0) return null;

    return (
      embeddedWallets.find(
        (wallet) => wallet.address.toLowerCase() === selectedWallet?.address?.toLowerCase(),
      ) ?? embeddedWallets[0]
    );
  }, [embeddedWallets, selectedWallet?.address]);

  if (cdpWallets.isInitialized && embeddedWallets.length === 0) {
    return null;
  }

  if (!activeWallet) {
    return (
      <div className="hidden h-10 w-44 animate-pulse rounded-full border border-border/70 bg-muted/60 sm:flex" />
    );
  }

  const handleWalletSelect = (wallet: HeaderEmbeddedWallet) => {
    setSelectedWallet(wallet.selection);
    setMenuOpen(false);
  };

  const handleSwap = () => {
    setSelectedWallet(activeWallet.selection);
    router.push("/defi/swap");
  };

  const handleBuy = () => {
    if (!activeWallet.canBuy) {
      toast.message(copy.toasts.buyOnlyBase);
      return;
    }
    setBuyOpen(true);
  };

  return (
    <>
      <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-background/80 p-1 sm:flex">
        <SettingsHeaderWalletSwitcherMenu
          activeWallet={activeWallet}
          embeddedWallets={embeddedWallets}
          menuOpen={menuOpen}
          copy={copy}
          onMenuOpenChange={setMenuOpen}
          onSelectWallet={handleWalletSelect}
        />

        <div className="h-5 w-px bg-border/70" />

        <div className="flex items-center gap-1 pr-0.5">
          <WalletActionButton icon={Send} label={copy.actions.send} onClick={() => setSendOpen(true)} />
          <WalletActionButton icon={ArrowDownLeft} label={copy.actions.receive} onClick={() => setReceiveOpen(true)} />
          <WalletActionButton icon={ArrowLeftRight} label={copy.actions.swap} onClick={handleSwap} />
          <WalletActionButton
            icon={CreditCard}
            label={activeWallet.canBuy ? copy.actions.buy : copy.actions.buyUnavailable}
            onClick={handleBuy}
            disabled={!activeWallet.canBuy}
          />
        </div>
      </div>

      <SettingsHeaderWalletSwitcherModals
        activeWallet={activeWallet}
        sendOpen={sendOpen}
        receiveOpen={receiveOpen}
        buyOpen={buyOpen}
        onSendOpenChange={setSendOpen}
        onReceiveOpenChange={setReceiveOpen}
        onBuyOpenChange={setBuyOpen}
      />
    </>
  );
}
