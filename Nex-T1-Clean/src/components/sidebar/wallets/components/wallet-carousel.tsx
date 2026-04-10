"use client";

import { useState } from "react";
import { WalletSnapshot } from "@/modules/wallets/profile";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateWalletModal } from "../create-wallet-modal";
import { Button } from "@/components/ui/button";
import { ExportCdpWalletDialog } from "./export-cdp-wallet-dialog";
import { WalletCarouselCard } from "./wallet-carousel-card";
import type { WalletViewType } from "../wallet-right-panel";
import { useTranslations } from "@/components/providers/locale-provider";
import { getWalletSidebarCopy } from "@/modules/app/i18n";

interface WalletCarouselProps {
  wallets: WalletSnapshot[];
  activeWalletId: string | null;
  onSelectWallet: (walletId: string) => void;
  onViewChange: (view: WalletViewType) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onHideWallet: (walletId: string) => void;
  hiddenWalletCount?: number;
  onRestoreHiddenWallets?: () => void;
}

export function WalletCarousel({
  wallets,
  activeWalletId,
  onSelectWallet,
  onViewChange,
  isLoading,
  onRefresh,
  onHideWallet,
  hiddenWalletCount = 0,
  onRestoreHiddenWallets,
}: WalletCarouselProps) {
  const t = useTranslations("app");
  const copy = getWalletSidebarCopy(t).carousel;
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exportWallet, setExportWallet] = useState<WalletSnapshot | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="mt-2 flex flex-col gap-2.5">
      <p className="text-sm font-medium text-[#666666] dark:text-zinc-300">{copy.title}</p>
      {isLoading ? (
          <div className="flex gap-3 pl-4">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-[204px] w-[min(84vw,264px)] rounded-[24px] bg-[#c4c4c4]/10 sm:w-[264px]"
            />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#EBEBEB] bg-white/60 p-4 text-sm text-[#666666] dark:border-white/10 dark:bg-white/[0.02] dark:text-zinc-400">
          <p>{hiddenWalletCount > 0 ? copy.allHidden : copy.noWallets}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-black/10 bg-white/70 text-[#171717] hover:bg-black/5 dark:border-white/15 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-white/10"
              onClick={() => setCreateModalOpen(true)}
            >
              {copy.createWallet}
            </Button>
            {hiddenWalletCount > 0 && onRestoreHiddenWallets ? (
              <Button
                size="sm"
                variant="outline"
                className="border-black/10 bg-white/70 text-[#171717] hover:bg-black/5 dark:border-white/15 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-white/10"
                onClick={onRestoreHiddenWallets}
              >
                {copy.showHiddenWallets}
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent className="pb-2 pl-4 pr-2">
            {wallets.map((wallet) => (
              <CarouselItem key={wallet.id} className="basis-auto pt-1">
                <WalletCarouselCard
                  wallet={wallet}
                  isActive={activeWalletId === wallet.id}
                  onSelect={() => onSelectWallet(wallet.id)}
                  onViewChange={onViewChange}
                  onHideWallet={onHideWallet}
                  onRequestExport={(candidate) => {
                    setExportWallet(candidate);
                    setExportOpen(true);
                  }}
                />
              </CarouselItem>
            ))}
            <CarouselItem className="basis-auto">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className={cn(
                  "group relative flex h-[204px] w-[min(84vw,264px)] shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-[24px] border border-dashed border-black/10 bg-black/[0.03] backbackdrop-blur-lg transition-all duration-150 hover:border-black/20 hover:bg-black/[0.05] dark:border-white/10 dark:bg-[#c4c4c4]/10 dark:hover:border-white/18 dark:hover:bg-[#c4c4c4]/14 sm:w-[264px]",
                )}
              >
                <Plus className="h-5 w-5 text-[#666666] transition-colors group-hover:text-[#171717] dark:text-white/55 dark:group-hover:text-white" />
                <span className="text-[11px] font-medium text-[#666666] transition-colors group-hover:text-[#171717] dark:text-white/65 dark:group-hover:text-white">
                  {copy.createWalletCta}
                </span>
              </button>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      )}

      <CreateWalletModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          onRefresh();
        }}
      />
      <ExportCdpWalletDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        wallet={exportWallet}
      />
    </div>
  );
}
