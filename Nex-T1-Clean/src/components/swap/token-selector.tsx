"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { isValidEVMAddress, isValidSolanaAddress } from "@/lib/utils/token-utils";
import { useTokenList } from "@/hooks/use-token-list";
import { resolveTokenImport } from "@/modules/tokens/client/resolve-token";
import { SOLANA_CHAIN_ID } from "@/modules/tokens/chains";
import { isTokenSelectable, resolveTokenWarnings } from "@/modules/tokens/utils/warnings";
import { cn } from "@/lib/utils";
import type { TokenInfo } from "@/stores/use-swap-store";
import {
  FilterType,
  getFilterLogo,
  matchesTokenFilter,
  POPULAR_TOKEN_SYMBOLS,
  resolveSelectedChainId,
  TOKEN_SELECTOR_FILTERS,
} from "@/components/swap/token-selector/token-selector.config";
import { TokenRow } from "@/components/swap/token-selector/token-selector-row";

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
}

export function TokenSelector({ isOpen, onClose, onSelect }: TokenSelectorProps) {
  const { tokens, loading } = useTokenList();
  const [search, setSearch] = useState("");
  const [selectedChain, setSelectedChain] = useState<FilterType>("All");
  const [customAddressMode, setCustomAddressMode] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const filteredTokens = useMemo(() => {
    return tokens.filter((token) => {
      const chainMatch = matchesTokenFilter(token, selectedChain);
      const searchMatch =
        token.symbol.toLowerCase().includes(search.toLowerCase()) ||
        token.name.toLowerCase().includes(search.toLowerCase()) ||
        token.address.toLowerCase() === search.toLowerCase();
      return chainMatch && searchMatch;
    });
  }, [tokens, search, selectedChain]);

  const handleCustomAddressImport = async () => {
    const trimmed = search.trim();
    if (!trimmed) {
      return;
    }

    const isEvm = isValidEVMAddress(trimmed);
    const isSolana = isValidSolanaAddress(trimmed);
    if (!isEvm && !isSolana) {
      setResolveError("Enter a valid EVM contract or Solana mint address.");
      return;
    }

    if (isSolana && selectedChain !== "All" && selectedChain !== "Solana") {
      setResolveError("Solana imports require the Solana filter.");
      return;
    }

    if (isEvm && (selectedChain === "All" || selectedChain === "Solana")) {
      setResolveError("Choose the token's EVM chain before importing.");
      return;
    }

    const chainId = isSolana ? SOLANA_CHAIN_ID : resolveSelectedChainId(selectedChain);
    if (!chainId) {
      setResolveError("Choose a supported chain before importing.");
      return;
    }

    setIsResolving(true);
    setResolveError(null);
    try {
      const token = await resolveTokenImport({ chainId, address: trimmed });
      const warnings = resolveTokenWarnings(token);
      if (!isTokenSelectable(token, { allowUnsupported: true })) {
        setResolveError(warnings[0]?.message ?? "This token cannot be imported.");
        return;
      }

      setCustomAddressMode(false);
      setSearch("");
      onSelect(token as TokenInfo);
      onClose();
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : "Failed to resolve token.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] w-[95vw] sm:w-[400px] p-0 overflow-hidden bg-[#0f0f10]/60 backdrop-blur-md border border-white/10 text-foreground shadow-2xl shadow-black/50" style={{ fontFamily: "var(--font-geist-sans)" }}>
        <DialogTitle className="sr-only">Select Token</DialogTitle>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-8 pb-2">
           <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Token</span>
           <div className="flex items-center gap-2">
               <span className="text-[10px] text-muted-foreground">Custom Address</span>
               <Switch 
                    checked={customAddressMode} 
                    onCheckedChange={(checked) => {
                        setCustomAddressMode(checked);
                        setResolveError(null);
                    }}
                    size="xs"
               />
           </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 group-focus-within:text-foreground transition-colors" />
                <Input
                    className="w-full h-10 pl-9 pr-3 bg-card border border-border/60 rounded-lg text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/20 transition-all"
                    placeholder={customAddressMode ? "Paste token address..." : "Search token..."}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setResolveError(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && customAddressMode) {
                            handleCustomAddressImport();
                        }
                    }}
                />
            </div>
            {customAddressMode ? (
                <div className="px-1 pt-2 text-[11px]">
                    {isResolving ? (
                        <span className="text-muted-foreground">Resolving token metadata...</span>
                    ) : resolveError ? (
                        <span className="text-red-400">{resolveError}</span>
                    ) : (
                        <span className="text-muted-foreground">
                            Select the chain first for EVM imports. Solana imports can use the Solana filter.
                        </span>
                    )}
                </div>
            ) : null}
        </div>

        {/* Chain Filters */}
         <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar">
                {TOKEN_SELECTOR_FILTERS.map((filter) => {
                    const logo = getFilterLogo(filter);
                    return (
                    <button
                        key={filter}
                        onClick={() => {
                            setSelectedChain(filter);
                            setResolveError(null);
                        }}
                        className={cn(
                            "w-8 h-8 shrink-0 rounded-md text-[10px] font-medium transition-all flex items-center justify-center border",
                            selectedChain === filter
                                ? "bg-white/10 text-foreground border-white/20"
                                : "bg-transparent text-muted-foreground border-transparent hover:bg-white/5 hover:text-foreground"
                        )}
                    >
                        {logo ? (
                            <div className="w-full h-full rounded-md overflow-hidden relative">
                                <Image 
                                    src={logo} 
                                    alt={filter} 
                                    fill 
                                    className="object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        ) : (
                            <span className="text-[10px]">All</span>
                        )}
                    </button>
                )})}
            </div>

        {/* Token List */}
        <ScrollArea className="h-[380px] px-1.5">
            <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
                
                {/* Section Title: Popular (Only show if no search & All selected) */}
                {!search && selectedChain === "All" && (
                    <div className="mb-1.5">
                        <div className="px-1 mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Popular</div>
                         {tokens
                            .filter(t => POPULAR_TOKEN_SYMBOLS.includes(t.symbol.toUpperCase()))
                            .slice(0, 5)
                            .map((token, idx) => (
                             <TokenRow key={`pop-${token.assetId}-${idx}`} token={token} onSelect={() => { onSelect(token); onClose(); }} />
                         ))}
                    </div>
                )}
                
                {/* Section Title: All Tokens */}
                <div className="px-1 mb-1 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">All tokens</div>
                
                {loading ? (
                    <div className="flex flex-col gap-2 py-6 items-center justify-center text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-transparent rounded-full" />
                        <span className="text-xs">Loading tokens...</span>
                    </div>
                ) : filteredTokens.length > 0 ? (
                    filteredTokens.slice(0, 100).map((token, index) => (
                        <TokenRow key={`${token.assetId}-${index}`} token={token} onSelect={() => { onSelect(token); onClose(); }} />
                    ))
                ) : (
                     <div className="py-6 text-center text-muted-foreground text-xs">
                        {customAddressMode ? "Enter a valid address to import" : "No tokens found"}
                    </div>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
