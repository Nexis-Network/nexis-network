"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, Ellipsis } from "lucide-react";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { BiAnchor } from "react-icons/bi"; // Fallback icons
import { BsFillBookmarkStarFill } from "react-icons/bs";
import { FaCloud, FaEthereum } from "react-icons/fa";
import { VscSparkleFilled } from "react-icons/vsc";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletAccounts } from "@/lib/hooks/use-unified-portfolio";
import { WalletBalanceDisplay } from "./wallet-metrics";
import { createClient } from "@/lib/supabase/client";

function useCurrentUser() {
    const [userId, setUserId] = useState<string | undefined>(undefined);
    // Create client once
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        supabase.auth.getUser().then((response: UntypedJson) => {
            setUserId(response.data.user?.id);
        });
    }, [supabase]);
    return userId;
}

type WalletPortfolioCardItem = {
    name: string;
    icon: React.ElementType<{ className?: string }>;
    bgColor: string;
    address: string;
    chainFamily: string;
    chainId?: string;
};

const Wallet01 = () => {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const userId = useCurrentUser();
  const { wallets = [], isLoading } = useWalletAccounts(userId);

  // Group assets by Wallet ID
  const walletItems = useMemo(() => {
    if (!wallets) return [];
    
    // Color palette for wallets
    const colors = ["bg-purple-500", "bg-neutral-900", "bg-cyan-500", "bg-blue-500", "bg-[#8eb94f]", "bg-indigo-500"];
    const icons = [VscSparkleFilled, BsFillBookmarkStarFill, FaCloud, BiAnchor, FaEthereum];

    return wallets.map((w: UntypedJson, idx: number) => ({
      name: w?.metadata?.label || "Wallet",
      icon: icons[idx % icons.length],
      bgColor: colors[idx % colors.length],
      address: w.address,
      chainFamily: w.chain_id === 0 ? "solana" : "evm", // Simple routing logic
      chainId: w.chain_id === 0 ? undefined : `0x${w.chain_id.toString(16)}`
    }));
  }, [wallets]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setExpandedCard(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCardClick = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const renderCard = (item: WalletPortfolioCardItem, index: number, isBottomRow = false) => {
    const isExpanded = expandedCard === index;
    // ... (rest of logic same as original)
    // Dynamic sizing logic:
    const hasThreeBottomCards = expandedCard !== null && getBottomRowCards().length === 3;

    return (
      <motion.div
        key={index}
        layoutId={`card-${index}`}
        className={`relative flex cursor-pointer flex-col items-start justify-between overflow-hidden p-3 text-white ${
          isExpanded
            ? "h-[180px] w-full"
            : hasThreeBottomCards && isBottomRow
              ? "h-[100px] w-[100px] sm:w-[120px]"
              : "h-[125px] w-[140px] sm:w-[160px]"
        } ${item.bgColor}`}
        style={{
          transformOrigin: "50% 50% 0px",
          transform: "none",
          borderRadius: "24px",
        }}
        onClick={() => !isExpanded && handleCardClick(index)} // Click whole card if not expanded
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex items-center justify-center">
            <motion.div layoutId={`icon-${index}`}>
              {(() => {
                const Icon = item.icon;
                return (
                  <Icon
                    className={`fill-white ${
                      isExpanded
                        ? "h-12 w-12"
                        : hasThreeBottomCards && isBottomRow
                          ? "h-6 w-6"
                          : "h-8 w-8"
                    }`}
                  />
                );
              })()}
            </motion.div>
          </div>

          {!isExpanded && (
            <motion.div
              // onClick handled by parent now for better UX? Original had ellipses click.
              // We'll keep ellipses but spread click.
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 p-0.5 transition-colors duration-150 ease-out hover:bg-white/30"
            >
              <Ellipsis />
            </motion.div>
          )}

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                layoutId="copy-address"
                className="absolute right-4 top-4 flex items-center justify-center gap-3 font-semibold tracking-tight"
                onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(item.address);
                }}
              >
                <p>Copy Address</p>
                <div className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/20 transition-colors duration-150 ease-out hover:bg-white/30">
                  <Copy />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col items-start justify-center">
          <motion.span
            layoutId={`title-${index}`}
            className={`font-openrunde select-none font-semibold text-white ${
              isExpanded
                ? "text-xl"
                : hasThreeBottomCards && isBottomRow
                  ? "text-sm"
                  : "text-base"
            }`}
          >
            {item.name}
          </motion.span>
          <motion.span
            layoutId={`desc-${index}`}
            className={`font-openrunde font-semibold text-white/50 flex min-h-[22px] ${
              isExpanded
                ? "text-lg"
                : hasThreeBottomCards && isBottomRow
                  ? "text-xs"
                  : "text-sm"
            }`}
          >
             {/* Uses standardized metrics display routing EVM/Solana directly inside child via SingleFlight lock cache! */}
            <WalletBalanceDisplay 
                 address={item.address} 
                 chainFamily={item.chainFamily as "evm" | "solana"} 
                 chainId={item.chainId} 
            />
            <span className="ml-1">
                 {item.chainFamily === "evm" ? "ETH" : "SOL"}
            </span>
          </motion.span>
        </div>
      </motion.div>
    );
  };

  const getTopRowCards = (): WalletPortfolioCardItem[] => {
    if (expandedCard === null) {
      return walletItems.slice(0, 2);
    }
    return walletItems.filter((_val: WalletPortfolioCardItem, index: number) => index === expandedCard);
  };

  const getBottomRowCards = (): WalletPortfolioCardItem[] => {
    if (expandedCard === null) {
      return walletItems.slice(2, 4);
    }
    return walletItems.filter((_val: WalletPortfolioCardItem, index: number) => index !== expandedCard);
  };

  return (
    <div className="font-open-runde flex h-full w-full flex-col items-center justify-center gap-4 p-4">
      <div
        ref={containerRef}
        className="flex h-[300px] w-full max-w-[360px] flex-col justify-end gap-4"
      >
        {isLoading ? (
          <>
            <div className="flex gap-4">
              <Skeleton className="h-[125px] w-[160px] rounded-[24px] bg-[#c4c4c4]/10" />
              <Skeleton className="h-[125px] w-[160px] rounded-[24px] bg-[#c4c4c4]/10" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-[125px] w-[160px] rounded-[24px] bg-[#c4c4c4]/10" />
              <Skeleton className="h-[125px] w-[160px] rounded-[24px] bg-[#c4c4c4]/10" />
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-4">
              {getTopRowCards().map((item: WalletPortfolioCardItem, index: number) => {
                const originalIndex = expandedCard !== null ? expandedCard : index;
                if (!item) return null;
                return renderCard(item, originalIndex, false);
              })}
            </div>
            <div className="flex gap-4">
              {getBottomRowCards().map((item: WalletPortfolioCardItem, index: number) => {
                const originalIndex =
                  expandedCard !== null
                    ? walletItems.findIndex((_val: WalletPortfolioCardItem, i: number) => i !== expandedCard && walletItems[i] === item)
                    : index + 2;
                if (!item) return null;
                return renderCard(item, originalIndex, true);
              })}
            </div>
          </>
        )}
        {walletItems.length === 0 && (
            <div className="text-center text-muted-foreground text-sm">No wallets found.</div>
        )}
      </div>
    </div>
  );
};

export { Wallet01 };
