import React from 'react';
import { cn } from '@/lib/utils';
import { TokenBalance } from './token-balance';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { VerifiedBadge } from '@/components/ui/verified-badge';

import Image from 'next/image';

export interface AssetRowToken {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  uiAmount: number | string;
  priceUsd: number | null;
  valueUsd: number | null;
  logoURI: string | null;
  isNative: boolean;
  chain?: string;
}

interface AssetRowProps {
  token: AssetRowToken;
  className?: string;
  onClick?: () => void;
  isVerified?: boolean;
  chainLogoUrl?: string;
}

export const AssetRow: React.FC<AssetRowProps> = ({ token, className, onClick, isVerified, chainLogoUrl }) => {

  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer", 
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-9 w-9 border border-border/50">
            <AvatarImage src={token.logoURI || undefined} alt={token.symbol} />
            <AvatarFallback className="text-xs bg-muted">
              {token.symbol?.slice(0, 2).toUpperCase() ?? "??"}
            </AvatarFallback>
          </Avatar>
          {chainLogoUrl ? (
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background p-0.5 overflow-hidden ring-1 ring-border z-20">
                <div className="relative w-full h-full">
                  <Image src={chainLogoUrl} alt="chain" fill sizes="16px" className="object-cover" />
                </div>
            </div>
          ) : (
            isVerified && <VerifiedBadge className="h-4 w-4 -bottom-1 -right-1 z-20" />
          )}
        </div>
        
        <div className="flex flex-col">
          <span className="font-semibold text-sm leading-none">{token.symbol || "Unknown"}</span>
          <span className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
            {token.name || token.id.slice(0, 8) + '...'}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <div className="font-medium text-sm">
           {token.valueUsd && token.valueUsd > 0
             ? `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(token.valueUsd)}`
             : '-'
           }
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center">
          <TokenBalance amount={token.uiAmount} decimals={2} symbol={token.symbol} />
        </div>
      </div>
    </div>
  );
};
