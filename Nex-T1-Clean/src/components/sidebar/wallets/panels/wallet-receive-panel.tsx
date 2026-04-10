"use client";

import { WalletSnapshot } from "@/modules/wallets/profile";
import { Copy, Check, Info } from "lucide-react";
import { ActionSlideButton } from "../action-slide-button";
import { toast } from "sonner";
import { useState } from "react";
import Image from "next/image";

export function WalletReceivePanel({ wallet }: { wallet: WalletSnapshot }) {
  const isSolana = wallet.metadata?.kind === "solana" || wallet.type === "external_solana" || (wallet.address?.length && !wallet.address.startsWith("0x"));
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success("Address Copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet.address}&bgcolor=ffffff&color=000000&margin=0`;

  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto pr-1 custom-scrollbar">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-[#171717] dark:text-white">Receive Assets</h3>
        
        <div className="rounded-lg bg-blue-500/10 p-3 flex items-start gap-3 border border-blue-500/20">
            <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-200">
                Only send <strong>{isSolana ? "Solana (SOL) and SPL tokens" : "Ethereum (EVM) assets"}</strong> to this address. Sending other assets may result in permanent loss.
            </p>
        </div>

        <div className="flex flex-col items-center justify-center py-6 space-y-6">
            <div className="bg-white p-3 rounded-2xl h-48 w-48 shadow-2xl flex items-center justify-center">
                 {/* Real QR Code via API */}
                 {wallet.address ? (
                     <Image 
                         src={qrUrl} 
                         alt="Wallet Address QR" 
                         width={192} 
                         height={192} 
                         className="object-contain" 
                         unoptimized 
                     />
                 ) : (
                     <div className="h-full w-full bg-zinc-100 animate-pulse rounded-xl" />
                 )}
            </div>
            <div className="text-center space-y-1">
                <p className="text-sm text-[#666666] dark:text-zinc-400">Scan to pay</p>
            </div>
        </div>

        {/* Address Box */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-[#666666] dark:text-zinc-500">Wallet address</span>
          <div 
            className="group relative flex cursor-pointer items-center justify-between rounded-xl border border-black/10 bg-white/70 p-4 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            onClick={copyToClipboard}
          >
            <p
              className="max-w-[200px] truncate font-mono text-xs text-[#171717] dark:text-zinc-300"
              title={wallet.address ?? ""}
            >
              {wallet.address}
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.05] transition-colors group-hover:bg-black/[0.08] dark:bg-white/5 dark:group-hover:bg-white/20">
                 {copied ? <Check className="h-4 w-4 text-sky-500 dark:text-sky-400" /> : <Copy className="h-4 w-4 text-[#666666] group-hover:text-[#171717] dark:text-zinc-400 dark:group-hover:text-white" />}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <ActionSlideButton 
            label={copied ? "Copied!" : "Copy Address"}
            onClick={copyToClipboard}
        />
      </div>
    </div>
  );
}
