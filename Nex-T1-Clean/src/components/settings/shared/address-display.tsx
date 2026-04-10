"use client";

import { ExternalLink, Check } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { MonoValue } from "./mono-value";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon } from "@/components/sidebar-03/animated-icons";

interface AddressDisplayProps {
  address: string;
  truncateLength?: number;
  explorerUrl?: string;
  className?: string;
}

function truncateAddress(addr: string, len = 6): string {
  if (addr.length <= len * 2 + 2) return addr;
  return `${addr.slice(0, len + 2)}...${addr.slice(-len)}`;
}

export function AddressDisplay({ address, truncateLength = 4, explorerUrl, className }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [address]);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-[var(--settings-elevated)]"
        >
            <MonoValue className="text-[var(--settings-foreground-muted)]">
              {truncateAddress(address, truncateLength)}
            </MonoValue>
            {copied
              ? <Check className="size-3 text-[var(--settings-foreground-strong)]" />
              : <CopyIcon className="size-3 text-[var(--settings-foreground-muted)]" />}
        </button>
      </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {copied ? "Copied!" : "Click to copy"}
        </TooltipContent>
      </Tooltip>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--settings-foreground-muted)] transition-colors hover:text-[var(--settings-foreground-strong)]"
        >
          <ExternalLink className="size-3" />
        </a>
      )}
    </span>
  );
}
