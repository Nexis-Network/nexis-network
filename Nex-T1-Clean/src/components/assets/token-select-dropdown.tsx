"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { AssetTick, MOCK_ASSETS } from "@/lib/utils/asset-normalization";
import { findAssetCrossChain } from "@/server/actions/market-data";
import { resolveChainId, SOLANA_CHAIN_ID } from "@/modules/tokens/chains";
import { useTokenSearch } from "@/modules/tokens/hooks/use-token-search";
import type { TokenAssetInfo } from "@/modules/tokens/types";

import { logger } from "@/lib/logger";
interface TokenSelectDropdownProps {
  selectedToken?: AssetTick;
  onSelect: (token: AssetTick) => void;
  chainId?: string;
  defaultTokens?: AssetTick[]; // Preload some defaults
}

export function TokenSelectDropdown({ selectedToken, onSelect, chainId, defaultTokens = MOCK_ASSETS }: TokenSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AssetTick[]>(defaultTokens);
  const [loading, setLoading] = useState(false);
  const resolvedChainId = resolveChainId(chainId ?? undefined);
  const tokenSearch = useTokenSearch(query, {
    chainId: resolvedChainId ?? undefined,
    includeCustom: true,
    includeUnsupported: true,
  });

  const registryTokens = tokenSearch.tokens;

  const toAssetTick = (token: TokenAssetInfo): AssetTick => ({
    symbol: token.symbol,
    name: token.name,
    price: token.priceUSD ? Number(token.priceUSD) : 0,
    change24h: 0,
    chain: token.platform,
    chainId: token.chainId === SOLANA_CHAIN_ID ? "solana" : String(token.chainId),
    address: token.address,
    decimals: token.decimals,
    logoUrl: token.logoURI,
  });

  const buildDedupKey = (token: AssetTick) => {
    const normalizedAddress = token.chain === "solana"
      ? token.address
      : token.address.toLowerCase();
    return `${token.chainId}:${normalizedAddress}`;
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (!query) {
            if (registryTokens.length > 0) {
                setResults(registryTokens.slice(0, 100).map(toAssetTick));
            } else {
                setResults(defaultTokens);
            }
            return;
        }

        setLoading(true);
        try {
            // 1. Server Side Search
            const serverRes = await findAssetCrossChain(query);
            
            // 2. Client Side Filter from Extended List
            const clientMatches = registryTokens.map(toAssetTick);

            // Merge and Deduplicate by address
            const merged = [...serverRes];
            const seenMap = new Set(merged.map(buildDedupKey));
            
            clientMatches.forEach(c => {
                const key = buildDedupKey(c);
                if (!seenMap.has(key)) {
                    merged.push(c);
                    seenMap.add(key);
                }
            });

            const filtered = resolvedChainId
              ? merged.filter((token) =>
                  token.chain === "solana"
                    ? resolvedChainId === SOLANA_CHAIN_ID
                    : token.chainId === String(resolvedChainId),
                )
              : merged;
            setResults(filtered.slice(0, 50)); // Limit to 50 results
        } catch (e) {
            logger.error(e);
        } finally {
            setLoading(false);
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [defaultTokens, query, registryTokens, resolvedChainId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent border-border/60 hover:bg-accent hover:text-foreground text-left h-12"
        >
          {selectedToken ? (
              <div className="flex items-center gap-2">
                  <div className="relative w-6 h-6 rounded-full overflow-hidden bg-muted/40 shrink-0">
                      {selectedToken.logoUrl ? (
                          <Image src={selectedToken.logoUrl} alt={selectedToken.symbol} fill className="object-cover" />
                      ) : (
                           <div className="w-full h-full flex items-center justify-center text-[8px]">{selectedToken.symbol[0]}</div>
                      )}
                  </div>
                  <span className="font-semibold">{selectedToken.symbol}</span>
              </div>
          ) : (
            <span className="text-muted-foreground">Select token...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search token..." onValueChange={setQuery} className="h-9 border-none focus:ring-0" />
          <CommandList className="custom-scrollbar max-h-[300px]">
            {loading && <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>}
            <CommandEmpty>No token found.</CommandEmpty>
            <CommandGroup>
              {results.map((token) => (
                <CommandItem
                  key={token.address + token.chainId}
                  value={token.symbol}
                  onSelect={() => {
                    onSelect(token);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-xl aria-selected:bg-accent aria-selected:text-foreground"
                >
                  <div className="flex items-center gap-2 w-full">
                       <div className="relative w-6 h-6 rounded-full overflow-hidden bg-muted/40 shrink-0">
                          {token.logoUrl ? (
                              <Image src={token.logoUrl} alt={token.symbol} fill className="object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px]">{token.symbol[0]}</div>
                          )}
                      </div>
                      <div className="flex flex-col">
                          <span className="font-medium">{token.symbol}</span>
                          <span className="text-[10px] text-muted-foreground">{token.name}</span>
                      </div>
                      {selectedToken?.address === token.address && (
                          <Check className="ml-auto h-4 w-4 text-inherit" />
                      )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
