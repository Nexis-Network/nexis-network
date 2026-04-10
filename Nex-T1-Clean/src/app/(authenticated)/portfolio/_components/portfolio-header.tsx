"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check, Plus, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CurrentUserAvatar } from "@/components/app-header/current-user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WalletPortfolio } from "@/lib/user/profile";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { useResolvedCdpWallets } from "@/lib/cdp/use-resolved-cdp-wallets";
import {
  augmentWalletPortfoliosWithResolvedCdp,
  getPortfolioWalletKindLabel,
  isPortfolioSelectableWallet,
} from "@/lib/cdp/cdp-wallet-portfolios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { registerWalletPasskey } from "@/lib/passkeys/client";
import { logger } from "@/lib/logger";
// --- Types ---
interface ChainOption {
  id: string;
  label: string;
  icon: string; // Required now
}

interface PortfolioHeaderProps {
  wallets: WalletPortfolio[];
  selectedChainId?: string;
  onChainSelect?: (chainId: string) => void;
  selectedWalletId?: string | "all";
  onWalletSelect?: (walletId: string | "all") => void;
}

// --- Constants ---
const CHAINS: ChainOption[] = [
  {
    id: "all",
    label: "All Networks",
    icon: "/assets/portfolio/all-networks.png",
  },
  {
    id: "ethereum",
    label: "Ethereum",
    icon: "/icons/chain-icons/ethereum.svg",
  },
  { id: "base", label: "Base", icon: "/icons/chain-icons/base.svg" },
  {
    id: "optimism",
    label: "Optimism",
    icon: "/icons/chain-icons/optimism.svg",
  },
  {
    id: "arbitrum",
    label: "Arbitrum",
    icon: "/icons/chain-icons/arbitrum.svg",
  },
  { id: "polygon", label: "Polygon", icon: "/icons/chain-icons/polygon.svg" },
  { id: "solana", label: "Solana", icon: "/icons/chain-icons/solana.svg" },
  { id: "linea", label: "Linea", icon: "/icons/chain-icons/linea.svg" },
  { id: "monad", label: "Monad", icon: "/icons/chain-icons/monad-chain.jpg" },
  {
    id: "hyperliquid",
    label: "Hyperliquid",
    icon: "/icons/chain-icons/hyperliquid-logo.png",
  },
];

export function PortfolioHeader({
  wallets,
  selectedChainId = "all",
  onChainSelect,
  selectedWalletId = "all",
  onWalletSelect,
}: PortfolioHeaderProps) {
  const [isOpenWallet, setIsOpenWallet] = useState(false);
  const [isOpenChain, setIsOpenChain] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const { evmAddress, solanaAddress } = useResolvedCdpWallets({
    fallbackWallets: wallets,
  });

  const currentChain =
    CHAINS.find((c) => c.id === selectedChainId) || CHAINS[0];

  const augmentedWallets = useMemo(
    () =>
      augmentWalletPortfoliosWithResolvedCdp(wallets, {
        evmAddress,
        solanaAddress,
      }),
    [wallets, evmAddress, solanaAddress],
  );

  logger.debug(
    "[PortfolioHeader] selectable wallets:",
    augmentedWallets.length,
    augmentedWallets.map((wallet) => ({
      id: wallet.walletId,
      type: wallet.walletType,
      addr: wallet.address,
      prov: wallet.providerName,
    })),
  );

  const displayWallets = useMemo(() => {
    return augmentedWallets.filter(isPortfolioSelectableWallet);
  }, [augmentedWallets]);

  // Format wallet address for display (e.g., 0x12...3456)
  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const currentWalletLabel = useMemo(() => {
    if (selectedWalletId === "all") return "All Wallets";
    const w = augmentedWallets.find(
      (wallet) => wallet.walletId === selectedWalletId,
    );
    if (!w) return "Select Wallet";
    return formatAddress(w.address!);
  }, [selectedWalletId, augmentedWallets]);

  const handleCreateWallet = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from doing weird things if placed inside
    if (!user?.id) {
      toast.error("Please login to create a wallet");
      return;
    }

    try {
      setIsCreatingWallet(true);
      await registerWalletPasskey({ email: user?.email ?? undefined });
      await fetch("/api/nex/wallets/summary?refresh=1", {
        method: "GET",
      }).catch(() => {});

      toast.success("Passkey registered. Smart wallet provisioning started.");

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-summaries"] });
    } catch (error: UntypedJson) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Wallet creation failed", message);
      toast.error("Failed to create wallet: " + message);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-start gap-4 pt-2">
      {/* Top Row: Avatar/Wallet + Chain Selector */}
      <div className="flex flex-row items-center justify-between w-full h-[32px]">
        {/* Left Group: Avatar + Wallet Selector */}
        <div className="flex flex-row items-center gap-3">
          {/* User Avatar - Increased to 32px (approx 15% bigger than 27px) | Centered */}
          <div className="w-[32px] h-[32px] rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
            <CurrentUserAvatar />
          </div>

          <div className="flex items-center gap-2">
            {/* Wallet Selector Dropdown */}
            <DropdownMenu open={isOpenWallet} onOpenChange={setIsOpenWallet}>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-row items-center gap-1.5 focus:outline-none group">
                  <span className="font-roboto font-medium text-[16px] leading-[24px] text-foreground">
                    {currentWalletLabel}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 text-muted-foreground transition-transform duration-200",
                      isOpenWallet && "rotate-180",
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[280px] rounded-xl p-1 z-50"
              >
                <DropdownMenuItem
                  onClick={() => onWalletSelect?.("all")}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm cursor-pointer"
                >
                  <span>All Wallets</span>
                  {selectedWalletId === "all" && (
                    <Check className="w-4 h-4 text-inherit" />
                  )}
                </DropdownMenuItem>

                <div className="my-1 border-t border-border/60 mx-2" />

                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  {displayWallets.map((wallet) => (
                    <DropdownMenuItem
                      key={wallet.walletId}
                      onClick={() => onWalletSelect?.(wallet.walletId)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm cursor-pointer"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {getPortfolioWalletKindLabel(wallet)}
                        </span>
                        <span className="font-mono text-xs">
                          {formatAddress(wallet.address!)}
                        </span>
                      </div>
                      {selectedWalletId === wallet.walletId && (
                        <Check className="w-4 h-4 text-inherit" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Wallet Button (+) */}
            <button
              onClick={handleCreateWallet}
              disabled={isCreatingWallet}
              className="flex items-center justify-center w-[20px] h-[20px] rounded-full border border-border/60 text-muted-foreground transition-all hover:border-border hover:bg-accent hover:text-foreground"
              title="Create new Safe Core Wallet"
            >
              {isCreatingWallet ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Right Group: Chain Selector */}
        <DropdownMenu open={isOpenChain} onOpenChange={setIsOpenChain}>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-row items-center justify-center min-w-[120px] gap-2 rounded-[12px] border border-border/60 bg-card px-1.5 py-0.5 h-[32px] transition-colors hover:bg-accent/60 focus:outline-none">
              {/* Chain Icon */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "relative w-5 h-5 overflow-hidden",
                    currentChain.id === "all" ? "rounded-sm" : "rounded-full",
                  )}
                >
                  <Image
                    src={currentChain.icon}
                    alt={currentChain.label}
                    fill
                    sizes="20px"
                    className="object-cover"
                  />
                </div>
                <span className="font-roboto font-medium text-[14px] leading-[14px] text-foreground">
                  {currentChain.label}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform duration-200",
                  isOpenChain && "rotate-180",
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[200px] rounded-xl p-1 z-50"
          >
            {CHAINS.map((chain) => (
              <DropdownMenuItem
                key={chain.id}
                onClick={() => onChainSelect?.(chain.id)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "relative w-5 h-5 overflow-hidden",
                      chain.id === "all" ? "rounded-sm" : "rounded-full",
                    )}
                  >
                    <Image
                      src={chain.icon}
                      alt={chain.label}
                      fill
                      sizes="20px"
                      className="object-cover"
                    />
                  </div>
                  <span>{chain.label}</span>
                </div>
                {selectedChainId === chain.id && (
                  <Check className="w-4 h-4 text-inherit" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Horizontal Divider */}
      <div className="w-full h-[1px] bg-border/60" />
    </div>
  );
}
