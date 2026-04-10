"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Download, Box, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  NetworkEthereum,
  NetworkSolana,
  NetworkPolygon,
  NetworkArbitrumOne,
  NetworkBase,
  NetworkOptimism,
  NetworkAvalanche,
  NetworkBinanceSmartChain,
} from "@web3icons/react";
import type { MCPServer } from "@/lib/mcp/registry";
import { cn } from "@/lib/utils";
import { LIQUID_GLASS_LOGOS } from "@/components/liquid-glass-logos";

// Simple deterministic hash for mock stats
function getHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Helper to slugify name
function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

import { Switch } from "@/components/ui/switch";
import { McpApiKeyModal } from "@/components/mcp/mcp-api-key-modal";
import { createClient } from "@/lib/supabase/client";
import { McpService } from "@/lib/mcp/mcp-service";


import { logger } from '@/lib/logger';
interface McpServerCardProps {
  server: MCPServer;
  index?: number;
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export function McpServerCard({ server, index = 0, isEnabled = false, onToggle }: McpServerCardProps) {
  // Generate mock stats based on server name hash to be consistent
  const hash = getHash(server.name);
  const downloads = (hash % 50) + 1 + "K+"; // 1K+ to 50K+
  const toolsCount = (hash % 15) + 1; // 1 to 15 tools
  const isOfficial = hash % 3 === 0; // 33% chance of being "Official" (mock)
  
  const [modalOpen, setModalOpen] = React.useState(false);

  const handleToggle = async (checked: boolean) => {
      // If disabling, just do it
      if (!checked) {
          if (onToggle) onToggle(false);
          const supabase = createClient();
          await McpService.toggleServer(supabase, server.name, false);
          return;
      }

      // If enabling, check for env vars
      if (server.env && Object.keys(server.env).length > 0) {
          setModalOpen(true);
      } else {
          // No env needed, just enable
          if (onToggle) onToggle(true);
          const supabase = createClient();
          await McpService.toggleServer(supabase, server.name, true);
      }
  };

  const handleSaveConfig = async (env: Record<string, string>) => {
      // Use Server Action to encrypt and save
      const { saveUserMcpConfig } = await import("@/app/actions/mcp");
      const result = await saveUserMcpConfig(server.name, env);
      
      if (!result.success) {
          logger.error("Failed to save config:", result.error);
          // Could show toast here
          return;
      }

      if (onToggle) onToggle(true);
  };
  
  const CHAIN_ICON_MAP: Record<string, React.ComponentType<UntypedJson>> = {
    ethereum: NetworkEthereum,
    eth: NetworkEthereum,
    solana: NetworkSolana,
    sol: NetworkSolana,
    polygon: NetworkPolygon,
    matic: NetworkPolygon,
    arbitrum: NetworkArbitrumOne,
    arb: NetworkArbitrumOne,
    base: NetworkBase,
    optimism: NetworkOptimism,
    op: NetworkOptimism,
    avalanche: NetworkAvalanche,
    avax: NetworkAvalanche,
    bsc: NetworkBinanceSmartChain,
    binance: NetworkBinanceSmartChain,
    "bnb chain": NetworkBinanceSmartChain,
  };

  const CUSTOM_LOGOS: Record<string, string> = {
    chainlink: LIQUID_GLASS_LOGOS.chainlink,
    ethereum: LIQUID_GLASS_LOGOS.ethereum,
    eth: LIQUID_GLASS_LOGOS.ethereum,
    hyperliquid: LIQUID_GLASS_LOGOS.hyperliquid,
    bitcoin: LIQUID_GLASS_LOGOS.bitcoin,
    btc: LIQUID_GLASS_LOGOS.bitcoin,
    bnb: LIQUID_GLASS_LOGOS.bnb,
    bsc: LIQUID_GLASS_LOGOS.bnb,
    "bnb chain": LIQUID_GLASS_LOGOS.bnb,
    solana: LIQUID_GLASS_LOGOS.solana,
    xrp: LIQUID_GLASS_LOGOS.ripple,
    ripple: LIQUID_GLASS_LOGOS.ripple,
    etherscan: "/icons/web3-icons/etherscan.svg",
    linea: "/icons/chain-icons/linea.svg",
    sui: "/icons/chain-icons/sui.svg"
  };

  // Determine which custom logos to show
  const activeCustomLogos: string[] = [];
  const lowerName = server.name.toLowerCase();
  const lowerTags = (server.tags || []).map(t => t.toLowerCase());

  // Check name & tags for custom logo matches
  Object.keys(CUSTOM_LOGOS).forEach(key => {
     if (lowerName.includes(key) || lowerTags.includes(key)) {
         // Avoid duplicates if multiple keys point to same file
         const path = CUSTOM_LOGOS[key];
         if (!activeCustomLogos.includes(path)) {
             activeCustomLogos.push(path);
         }
     }
  });


  // Extract chain icons from tags
  const chainIcons = (server.tags || [])
    .map(tag => CHAIN_ICON_MAP[tag.toLowerCase()])
    .filter(Boolean);
  
  // Vibrant colors for icons - keeping logic but styling changes
  const colors = [
    "text-blue-500", "text-purple-500", "text-green-500", "text-orange-500", "text-pink-500"
  ];
  const iconColor = colors[hash % colors.length];

  // Mouse tracking for spotlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const { currentTarget, clientX, clientY } = event;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const background = useMotionTemplate`radial-gradient(
    200px circle at ${mouseX}px ${mouseY}px,
    rgba(14, 165, 233, 0.15),
    transparent 80%
  )`;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="h-full"
    >
      <div className="relative h-full block"> {/* Remove link wrapper around whole card to allow Switch interaction */}
       {/* Use a Link overlay for the clickable area but avoid covering the Switch */}

        <div
            className="group relative flex flex-col w-full h-[180px] bg-white dark:bg-[#0F0F0F] rounded-md border border-gray-200 dark:border-[#C4C4C4]/10 p-3 hover:border-sky-500/30 dark:hover:border-sky-500/30 hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors overflow-hidden box-border shadow-sm dark:shadow-none"
            onMouseMove={handleMouseMove}
        >
            {/* Clickable Area Overlay - Link to Details */}
            <Link href={`/mcp/${slugify(server.name)}`} className="absolute inset-0 z-0" />
        
            {/* Spotlight Effect Layer */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-md opacity-0 transition duration-300 group-hover:opacity-100"
                style={{ background }}
            />

            {/* Top Row: Icon + Badge + Switch */}
            <div className="relative z-10 flex justify-between items-start mb-3 pointer-events-none"> {/* Disable pointer events to allow click-through, enable on children */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className={cn("w-7 h-7 rounded-[4px] flex items-center justify-center bg-gray-100 dark:bg-white/5", iconColor)}>
                        {/* Generic Icon */}
                        <Box className="w-4 h-4" />
                    </div>
                     {isOfficial && (
                        <div className="flex items-center gap-0.5 px-1.5 py-[2px] rounded-[1px] bg-sky-500/10/50 dark:bg-sky-500/100/10 border border-sky-500/20 dark:border-blue-500/20">
                        <CheckCircle2 className="w-[8px] h-[8px] text-blue-500 dark:text-blue-400" />
                        <span className="text-[8px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-tight leading-none">Official</span>
                        </div>
                    )}
                </div>
            
                <div className="pointer-events-auto z-20" onClick={(e) => e.stopPropagation()}>
                    <Switch 
                        checked={isEnabled} 
                        onCheckedChange={handleToggle}
                        size="xs"
                    />
                </div>
            </div>

            {/* Content: Title & Vendor & Desc */}
            <div className="relative z-10 flex flex-col gap-1.5 flex-grow min-h-0 pointer-events-none">
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white line-clamp-1 leading-tight group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                    {server.name}
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-[#666] line-clamp-1 mb-0.5">
                    by {server.vendor}
                </p>
                <p className="text-[11px] text-gray-600 dark:text-[#888] line-clamp-4 leading-relaxed pb-2">
                    {server.description}
                </p>
            </div>



            {/* Footer: Stats */}
            <div className="relative z-10 flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-[#C4C4C4]/5 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-gray-500 dark:text-[#444] group-hover:text-gray-700 dark:group-hover:text-[#666] transition-colors">
                        <Box className="w-3 h-3" />
                        <span className="text-[9px] font-medium uppercase tracking-wide">{toolsCount} tools</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-[#444] group-hover:text-gray-700 dark:group-hover:text-[#666] transition-colors">
                        <Download className="w-3 h-3" />
                        <span className="text-[9px] font-medium uppercase tracking-wide">{downloads}</span>
                    </div>
                </div>

                {/* Chain Icons & Custom Logos */}
                <div className="flex items-center ml-2">
                     {/* 1. Custom Logos (Images) */}
                     {activeCustomLogos.map((logoPath, _i) => (
                         <div 
                            key={logoPath} 
                            className="relative z-10 first:ml-0 -ml-1.5 transition-transform hover:z-20 hover:scale-110 flex items-center justify-center bg-white dark:bg-[#0F0F0F] rounded-full ring-1 ring-white dark:ring-[#151515]"
                            style={{ width: 14, height: 14 }}
                          >
                            <Image 
                                src={logoPath} 
                                alt="logo" 
                                width={14} 
                                height={14} 
                                className="rounded-full object-cover"
                            />
                         </div>
                     ))}
                     
                     {/* 2. Web3Icons (Components) */}
                    {chainIcons.slice(0, 3 - activeCustomLogos.length).map((Icon, i) => (
                      <div 
                        key={i} 
                        className={cn(
                            "relative z-10 transition-transform hover:z-20 hover:scale-110 bg-white dark:bg-[#0F0F0F] rounded-full",
                             (activeCustomLogos.length > 0 || i > 0) ? "-ml-1.5" : ""
                        )}
                      >
                         <Icon 
                            variant="background" 
                            size={14} 
                            className="rounded-full ring-1 ring-white dark:ring-[#151515]"
                        />
                      </div>
                    ))}
                    
                    {/* Overflow indicator */}
                    {(chainIcons.length + activeCustomLogos.length) > 3 && (
                       <div className="relative z-0 -ml-1.5 flex items-center justify-center w-[14px] h-[14px] rounded-full bg-gray-100 dark:bg-[#222] ring-1 ring-white dark:ring-[#151515]">
                          <span className="text-[8px] font-bold text-gray-500 dark:text-gray-400">+</span>
                       </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </motion.div>
    
    <McpApiKeyModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        serverName={server.name}
        envSchema={server.env}
        onSave={handleSaveConfig}
    />
    </>
  );
}
