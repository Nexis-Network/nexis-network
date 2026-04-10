
import React from 'react';
import { cn } from '@/lib/utils';

interface TokenBalanceProps {
  amount: number | string;
  decimals?: number;
  symbol?: string;
  className?: string;
  maxDecimals?: number;
  prefix?: string;
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({
  amount,
  decimals = 2,
  symbol,
  className,
  maxDecimals = 4,
  prefix
}) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Handle invalid numbers
  if (isNaN(numericAmount)) {
    return <span className={cn("text-muted-foreground", className)}>-</span>;
  }

  // Formatting logic:
  // For standard view, we usually want 2 decimals.
  // For small amounts (< 0.01), we might want more precision (up to maxDecimals).
  // For typical display, standard Intl.NumberFormat is best.
  
  const effectiveDecimals = (Math.abs(numericAmount) < 0.01 && numericAmount !== 0) 
    ? maxDecimals 
    : decimals;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: effectiveDecimals,
  }).format(numericAmount);

  return (
    <span className={cn("font-medium", className)}>
      {prefix}{formatted} {symbol && <span className="text-muted-foreground ml-1">{symbol}</span>}
    </span>
  );
};
