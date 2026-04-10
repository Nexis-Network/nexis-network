"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info, Check } from "lucide-react";
import { useUserWallets } from "@/lib/hooks/wallets/profile/use-user-wallets";
import { useAccount } from "wagmi";
import Image from "next/image";
import { WalletPortfolio } from "@/lib/user/profile";

interface DestinationWalletSelectorProps {
  onSelect?: (address: string) => void;
  selectedAddress?: string | null;
}

export function DestinationWalletSelector({ onSelect, selectedAddress }: DestinationWalletSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: userWallets } = useUserWallets();
  const { address: activeEoaAddress } = useAccount();

  // Consolidate wallet options
  const wallets = React.useMemo(() => {
    const list: WalletPortfolio[] = [];
    
    // 1. Always offer the active connected EOA if available
    if (activeEoaAddress) {
      list.push({
        walletId: "active_eoa",
        walletType: "external_connected",
        address: activeEoaAddress,
        label: "Connected Wallet",
        topAssets: [],
        topChains: []
      });
    }

    // 2. Add wallets from profile explicitly marked
    if (userWallets?.wallets) {
      userWallets.wallets.forEach(w => {
        // Prevent dupes if profile has the active EOA linked
        if (w.address && w.address.toLowerCase() !== activeEoaAddress?.toLowerCase()) {
          list.push(w);
        }
      });
    }

    return list;
  }, [userWallets, activeEoaAddress]);

  // Find currently selected wallet detail
  const selectedWallet = wallets.find(w => w.address?.toLowerCase() === selectedAddress?.toLowerCase());
  
  const getWalletLabel = (w?: WalletPortfolio) => {
    if (!w) return "Select destination wallet";
    if (w.walletId === "active_eoa") return "Connected Wallet";
    if (w.walletType === "agent_generated") return w.label || "Safe Core Wallet";
    if (w.providerName === "Crossmint") return w.label || "Crossmint Wallet";
    return w.label || "External Wallet";
  };

  const getWalletIcon = (w?: WalletPortfolio) => {
    if (!w) return null;
    if (w.walletId === "active_eoa") {
      return (
        <div className="size-[24px] rounded-full border border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-blue-500 to-cyan-500" />
      );
    }
    if (w.walletType === "agent_generated") {
      return (
        <div className="size-[24px] rounded-full border border-[rgba(255,255,255,0.08)] bg-green-500 flex items-center justify-center p-1">
          <Image src="/assets/wallet-logos/safe.svg" alt="Safe" width={16} height={16} />
        </div>
      );
    }
    if (w.providerName === "Crossmint") {
      return (
        <div className="size-[24px] rounded-full border border-[rgba(255,255,255,0.08)] bg-black flex items-center justify-center p-1">
           <Image src="/assets/wallet-logos/crossmint.svg" alt="Crossmint" width={16} height={16} />
        </div>
      );
    }
    // Default gradient
    return (
      <div className="size-[24px] rounded-full border border-[rgba(255,255,255,0.08)] bg-gradient-to-r from-purple-500 to-indigo-500" />
    );
  };

  const formatAddress = (addr?: string | null) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="backdrop-blur-[12px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex flex-col items-start p-[17px] relative rounded-[12px] shrink-0 w-full" ref={dropdownRef}>
      <div className="flex flex-col items-start pb-[12px] relative w-full">
        <label className="font-sans font-normal text-[13.5px] text-white flex flex-col justify-center leading-[21px]">
          Destination wallet
        </label>
      </div>
      
      <div className="relative w-full">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`bg-[rgba(255,255,255,0.02)] border ${!selectedWallet ? "border-[#e24756]" : "border-[#26272d]"} flex h-[40px] items-center justify-between px-[9px] py-px relative rounded-[6px] w-full hover:bg-[rgba(255,255,255,0.05)] transition-colors`}
        >
          <div className="flex gap-[8px] items-center relative">
            <div className="relative size-[24px] rounded-full bg-[#26272d] flex items-center justify-center overflow-hidden">
              {getWalletIcon(selectedWallet)}
            </div>
            <div className="flex flex-col items-start">
              <span className="font-sans font-normal text-[13.5px] text-[#acadae] leading-[21px]">
                {getWalletLabel(selectedWallet)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center size-[24px] ml-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform duration-200 text-[#acadae] ${isOpen ? "rotate-180" : "rotate-0"}`}>
               <path d="M7 10l5 5 5-5H7z" fill="currentColor"/>
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#141415] border border-[rgba(255,255,255,0.12)] rounded-[8px] overflow-hidden z-[100] shadow-xl flex flex-col items-stretch max-h-[220px] overflow-y-auto">
             {wallets.length === 0 ? (
               <div className="p-4 text-center text-[13px] text-[#acadae] font-sans">
                 No wallets found. Connect a wallet first.
               </div>
             ) : (
               wallets.map(w => {
                 const isSelected = w.address?.toLowerCase() === selectedAddress?.toLowerCase();
                 return (
                   <button
                     key={w.address || w.walletId}
                     onClick={() => {
                        if (w.address && onSelect) onSelect(w.address);
                        setIsOpen(false);
                     }}
                     className={`flex items-center justify-between p-3 border-b border-[rgba(255,255,255,0.05)] last:border-0 hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left ${isSelected ? "bg-[rgba(255,255,255,0.02)]" : ""}`}
                   >
                      <div className="flex items-center gap-3">
                         <div className="relative size-[28px] rounded-full bg-[#26272d] flex items-center justify-center overflow-hidden shrink-0">
                           {getWalletIcon(w)}
                         </div>
                         <div className="flex flex-col">
                           <span className="font-sans text-[13.5px] text-white">
                             {getWalletLabel(w)}
                           </span>
                           <span className="font-mono text-[11px] text-[#78797a]">
                             {formatAddress(w.address)}
                           </span>
                         </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#47BB64]" />}
                   </button>
                 );
               })
             )}
          </div>
        )}
      </div>
      
      {!selectedWallet && (
        <div className="flex items-center pt-[4px] relative w-full">
          <div className="flex items-center text-[#e24756]">
            <Info className="size-[14px] shrink-0 mr-1" />
            <span className="font-sans font-normal text-[13.2px] leading-[21px]">
              Please select a destination address
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
