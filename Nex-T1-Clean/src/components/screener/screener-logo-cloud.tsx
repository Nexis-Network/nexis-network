"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Extended list of major chains for the marquee
const CHAINS = [
  { name: "Solana", id: "sol", logo: "https://cryptologos.cc/logos/solana-sol-logo.svg?v=026" },
  { name: "Ethereum", id: "eth", logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=026" },
  { name: "Base", id: "base", logo: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE2NTJGMCIvPjwvc3ZnPg==" },
  { name: "Arbitrum", id: "arb", logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=026" },
  { name: "Polygon", id: "poly", logo: "https://cryptologos.cc/logos/polygon-matic-logo.svg?v=026" },
  { name: "BNB Chain", id: "bnb", logo: "https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=026" },
  { name: "Avalanche", id: "avax", logo: "https://cryptologos.cc/logos/avalanche-avax-logo.svg?v=026" },
  { name: "Optimism", id: "op", logo: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg?v=026" },
];

const PROTOCOLS = [
    { name: "Uniswap", id: "uni", logo: "https://cryptologos.cc/logos/uniswap-uni-logo.svg?v=026" },
    { name: "Raydium", id: "ray", logo: "https://cryptologos.cc/logos/raydium-ray-logo.svg?v=026" },
    { name: "Pump.fun", id: "pump", logo: "https://pump.fun/favicon.ico" },
    { name: "Jupiter", id: "jup", logo: "https://static.jup.ag/jup/icon.png" },
    { name: "Orca", id: "orca", logo: "https://cryptologos.cc/logos/orca-orca-logo.svg?v=026" },
    { name: "Curve", id: "crv", logo: "https://cryptologos.cc/logos/curve-dao-token-crv-logo.svg?v=026" },
    { name: "Aave", id: "aave", logo: "https://cryptologos.cc/logos/aave-aave-logo.svg?v=026" },
    { name: "Lido", id: "ldo", logo: "https://cryptologos.cc/logos/lido-dao-ldo-logo.svg?v=026" },
];

export function ScreenerLogoCloud() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
        ScrollTrigger.create({
            trigger: containerRef.current,
            start: "top 80%",
            onEnter: () => {
                gsap.to(containerRef.current, { opacity: 1, duration: 1 });
            }
        });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="w-full py-20 border-t border-white/5 bg-[#0f0f10] opacity-0 transition-opacity">
      <div className="container mx-auto px-4 mb-10 text-center">
        <h3 className="text-sm font-semibold text-sky-500 uppercase tracking-widest mb-2">Supported Ecosystems</h3>
        <p className="text-white/40 text-sm">Real-time data across all major networks</p>
      </div>

      <div className="relative w-full overflow-hidden mask-gradient-x">
          {/* Marquee Row 1: Chains */}
        <div className="flex w-max animate-marquee space-x-12 mb-12">
            {[...CHAINS, ...CHAINS, ...CHAINS].map((chain, i) => (
                <div key={i} className="flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity duration-300">
                     <div className="w-10 h-10 relative grayscale hover:grayscale-0 transition-all duration-300">
                        {chain.logo.startsWith("http") ? (
                            <Image 
                                src={chain.logo} 
                                alt={chain.name} 
                                fill 
                                className="object-contain"
                            />
                        ) : (
                             <div className="w-full h-full bg-white/10 rounded-full" />
                        )}
                     </div>
                     <span className="text-lg font-medium text-white hidden md:block">{chain.name}</span>
                </div>
            ))}
        </div>

           {/* Marquee Row 2: Protocols  */}
        <div className="flex w-max animate-marquee space-x-16" style={{ animationDuration: '35s' }}>
             {[...PROTOCOLS, ...PROTOCOLS, ...PROTOCOLS].map((protocol, i) => (
                <div key={i} className="flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity duration-300">
                     <div className="w-10 h-10 relative grayscale hover:grayscale-0 transition-all duration-300">
                        {protocol.logo.startsWith("http") ? (
                            <Image 
                                src={protocol.logo} 
                                alt={protocol.name} 
                                fill 
                                className="object-contain rounded-full"
                            />
                        ) : (
                             <div className="w-full h-full bg-white/10 rounded-full" />
                        )}
                     </div>
                      <span className="text-lg font-medium text-white hidden md:block">{protocol.name}</span>
                </div>
            ))}
        </div>
        
        {/* Gradient Masks */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0f0f10] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0f0f10] to-transparent z-10 pointer-events-none" />
      </div>
    </section>
  );
}
