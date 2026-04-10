"use client";

import { useState } from "react";
import Image from "next/image";

import { VerifiedBadge } from "@/components/ui/verified-badge";
import { getChainInfo } from "@/modules/tokens/chains";
import type { TokenInfo } from "@/stores/use-swap-store";

export function TokenRow({ token, onSelect }: { token: TokenInfo; onSelect: () => void }) {
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const shouldRenderLogo = Boolean(token.logoURI) && !logoLoadFailed;

  return (
    <button
      onClick={onSelect}
      className="group flex items-center justify-between w-full p-3 rounded-xl hover:bg-[#1C1C1E] transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-10 w-10 shrink-0">
          <div className="h-full w-full rounded-full bg-[#2C2C2C] overflow-hidden flex items-center justify-center">
            {shouldRenderLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={token.logoURI}
                alt={token.symbol}
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              <span className="text-xs font-bold text-white">{token.symbol[0]}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md bg-[#131415] flex items-center justify-center border border-[#131415]">
            <ChainIcon chainId={token.chainId} />
          </div>
        </div>

        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white text-base">{token.symbol}</span>
            {token.isVerified ? (
              <VerifiedBadge className="static translate-y-0 translate-x-0 h-[14px] w-[14px]" />
            ) : null}
          </div>
          <span className="text-sm text-[#6B7280]">{token.name}</span>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span className="text-white font-medium">0.00</span>
        <span className="text-xs text-[#6B7280]">$0.00</span>
      </div>
    </button>
  );
}

function ChainIcon({ chainId }: { chainId: number }) {
  const logo = getChainInfo(chainId)?.logoURI;

  if (!logo) {
    return <div className="h-4 w-4 rounded-md bg-gray-500" />;
  }

  return (
    <div className="relative h-4 w-4 rounded-md overflow-hidden bg-[#131415]">
      <Image
        src={logo}
        alt={`Chain ${chainId}`}
        fill
        className="object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
