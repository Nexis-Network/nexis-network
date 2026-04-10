"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function ProductsSection() {
  return (
    <section className="w-full max-w-[1280px] mx-auto px-6 flex flex-col items-start gap-32 pt-24 pb-32 pointer-events-auto relative z-10">
      {/* Header */}
      <div className="flex flex-col items-start gap-12 w-full">
        <div className="flex items-center gap-2">
          <span className="text-[#7D8187] font-mono text-sm uppercase tracking-[1.4px]">[</span>
          <span className="text-[#7D8187] font-mono text-sm uppercase tracking-[1.4px]">Products</span>
          <span className="text-[#7D8187] font-mono text-sm uppercase tracking-[1.4px]">]</span>
        </div>
        <h2 className="text-white font-sans text-[47.6px] leading-[48px] font-normal tracking-[-1.2px]">
          Intelligence for DeFi
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 w-full divide-y divide-white/10 md:divide-y-0">
        {/* Card 1: Copilot */}
        <div className="flex flex-col p-8 gap-10 border-t border-white/10 first:border-t-0 md:border-t-0 md:border-l md:first:border-l-0 relative group">
          {/* Text Content */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-sans text-[20px] leading-[28px] font-normal">
              Nex-T1 Copilot
            </h3>
            <p className="text-[#7D8187] font-sans text-[15.8px] leading-[24px] font-normal">
              Your autonomous on-chain companion. Execute trades, manage positions, and analyze markets with natural language.
            </p>
          </div>

          {/* Visual Area */}
          <div className="relative h-[273px] w-full mt-4 flex items-center justify-center overflow-hidden">
            {/* Animated Chat Interface SVG */}
            <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-80 transition-opacity duration-500 -translate-y-6">
              <svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Background Grid */}
                <defs>
                  <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeOpacity="0.03" strokeWidth="0.5" />
                  </pattern>
                  <linearGradient id="scan-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="50%" stopColor="white" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect width="300" height="200" fill="url(#grid-pattern)" />

                {/* Chat Bubbles */}
                <g className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
                  <rect x="40" y="30" width="160" height="30" rx="8" fill="white" fillOpacity="0.02" stroke="white" strokeOpacity="0.08" />
                  <rect x="50" y="40" width="100" height="2" rx="1" fill="white" fillOpacity="0.2" />
                  <rect x="50" y="48" width="80" height="2" rx="1" fill="white" fillOpacity="0.2" />
                </g>

                <g className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                  <rect x="100" y="75" width="160" height="30" rx="8" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.15" />
                  <rect x="110" y="85" width="120" height="2" rx="1" fill="white" fillOpacity="0.4" />
                  <rect x="110" y="93" width="90" height="2" rx="1" fill="white" fillOpacity="0.4" />
                </g>

                <g className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                  <rect x="40" y="120" width="140" height="30" rx="8" fill="white" fillOpacity="0.02" stroke="white" strokeOpacity="0.08" />
                  <rect x="50" y="130" width="110" height="2" rx="1" fill="white" fillOpacity="0.2" />
                  <rect x="50" y="138" width="60" height="2" rx="1" fill="white" fillOpacity="0.2" />
                </g>

                {/* Processing Node */}
                <g className="animate-pulse duration-3000" filter="url(#glow)">
                  <circle cx="260" cy="135" r="15" fill="white" fillOpacity="0.01" stroke="white" strokeOpacity="0.05" />
                  <circle cx="260" cy="135" r="8" fill="white" fillOpacity="0.03" />
                  <circle cx="260" cy="135" r="2" fill="white" fillOpacity="0.5" />
                </g>

                {/* Scanning Line */}
                <rect x="0" y="0" width="300" height="60" fill="url(#scan-gradient)" className="animate-[scan_6s_ease-in-out_infinite]" opacity="0.5" />
              </svg>
            </div>
            
            {/* Button Positioned Absolutely */}
            <div className="absolute top-[223px] left-0 right-0 flex justify-center z-10">
              <Link
                href="https://nex-t1.ai"
                className="box-border flex flex-row justify-center items-center px-4 py-1.5 gap-2 h-[34px] border border-white/25 rounded-full mix-blend-normal bg-black/20 backbackdrop-blur-lg hover:bg-white/10 transition-colors group-hover:border-white/50"
              >
                <span className="font-mono text-[14px] leading-[20px] tracking-[1.4px] uppercase text-white text-center">
                  Launch
                </span>
                <ArrowUpRight className="w-3 h-3 text-white" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: API */}
        <div className="flex flex-col p-8 gap-10 border-t border-white/10 md:border-t-0 md:border-l border-white/10 relative group">
          {/* Text Content */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-sans text-[20px] leading-[28px] font-normal">
              Nex API
            </h3>
            <p className="text-[#7D8187] font-sans text-[15.8px] leading-[24px] font-normal">
              Empower your dApps with Agentic DeFi capabilities. Full access to Nex-T1&apos;s execution engine and intelligence.
            </p>
          </div>

          {/* Visual Area */}
          <div className="relative h-[321px] w-full mt-4 flex items-center justify-center overflow-hidden">
             {/* Animated Nodes SVG */}
             <div className="absolute inset-0 flex items-center justify-center opacity-50 group-hover:opacity-70 transition-opacity duration-500 -translate-y-6">
                <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <defs>
                    <radialGradient id="node-glow" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  
                  {/* Connection Lines - Subtle dashed movement */}
                  <path d="M150 150 L80 80" stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 6" className="animate-[dash_30s_linear_infinite]" />
                  <path d="M150 150 L220 80" stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 6" className="animate-[dash_30s_linear_infinite_reverse]" />
                  <path d="M150 150 L80 220" stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 6" className="animate-[dash_30s_linear_infinite]" />
                  <path d="M150 150 L220 220" stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 6" className="animate-[dash_30s_linear_infinite_reverse]" />
                  
                  {/* Central Hub */}
                  <circle cx="150" cy="150" r="60" fill="url(#node-glow)" />
                  <circle cx="150" cy="150" r="30" stroke="white" strokeOpacity="0.1" strokeWidth="0.5" fill="none" className="animate-[spin_20s_linear_infinite]" />
                  <circle cx="150" cy="150" r="25" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" fill="none" className="animate-[spin_15s_linear_infinite_reverse]" />
                  <circle cx="150" cy="150" r="2" fill="white" fillOpacity="0.8" filter="url(#glow)" />
                  
                  {/* Outer Nodes */}
                  <g className="group-hover:translate-y-[-4px] transition-transform duration-1000 ease-in-out">
                    <rect x="60" y="60" width="40" height="40" rx="4" stroke="white" strokeOpacity="0.1" fill="white" fillOpacity="0.01" />
                    <rect x="70" y="75" width="20" height="2" fill="white" fillOpacity="0.2" />
                    <rect x="70" y="83" width="15" height="2" fill="white" fillOpacity="0.2" />
                  </g>

                  <g className="group-hover:translate-y-[-4px] transition-transform duration-1000 ease-in-out delay-100">
                    <rect x="200" y="60" width="40" height="40" rx="4" stroke="white" strokeOpacity="0.1" fill="white" fillOpacity="0.01" />
                    <path d="M210 80 L220 75 L230 80" stroke="white" strokeOpacity="0.2" fill="none" />
                    <path d="M210 85 L220 90 L230 85" stroke="white" strokeOpacity="0.2" fill="none" />
                  </g>

                  <g className="group-hover:translate-y-[4px] transition-transform duration-1000 ease-in-out delay-200">
                    <rect x="60" y="200" width="40" height="40" rx="4" stroke="white" strokeOpacity="0.1" fill="white" fillOpacity="0.01" />
                    <circle cx="80" cy="220" r="8" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
                  </g>

                  <g className="group-hover:translate-y-[4px] transition-transform duration-1000 ease-in-out delay-300">
                    <rect x="200" y="200" width="40" height="40" rx="4" stroke="white" strokeOpacity="0.1" fill="white" fillOpacity="0.01" />
                    <rect x="215" y="215" width="10" height="10" fill="white" fillOpacity="0.2" />
                  </g>
                </svg>
             </div>

            {/* Button */}
            <div className="absolute bottom-[40px] left-0 right-0 flex justify-center z-10">
              <Link
                href="https://docs.nex-t1.ai/api"
                className="box-border flex flex-row justify-center items-center px-4 py-1.5 gap-2 h-[34px] border border-white/25 rounded-full mix-blend-normal bg-black/20 backbackdrop-blur-lg hover:bg-white/10 transition-colors group-hover:border-white/50"
              >
                <span className="font-mono text-[14px] leading-[20px] tracking-[1.4px] uppercase text-white text-center">
                  Get API Key
                </span>
                <ArrowUpRight className="w-3 h-3 text-white" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card 3: Docs */}
        <div className="flex flex-col p-8 gap-10 border-t border-white/10 md:border-t-0 md:border-l border-white/10 relative group">
          {/* Text Content */}
          <div className="flex flex-col gap-4">
            <h3 className="text-white font-sans text-[19.8px] leading-[28px] font-normal">
              Documentation
            </h3>
            <p className="text-[#7D8187] font-sans text-[15.6px] leading-[24px] font-normal">
              Integration guides, SDK references, and tutorials for building the next generation of autonomous finance.
            </p>
          </div>

          {/* Visual Area */}
          <div className="relative h-[328px] w-full mt-4 flex items-center justify-center overflow-hidden">
             {/* Abstract Docs SVG */}
             <div className="absolute inset-0 flex items-center justify-center opacity-50 group-hover:opacity-70 transition-opacity duration-500 -translate-y-6">
                <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  {/* Layered Pages */}
                  <g transform="translate(0, 10)" className="group-hover:translate-y-0 transition-transform duration-700 ease-out">
                    <rect x="60" y="40" width="180" height="220" rx="2" stroke="white" strokeOpacity="0.08" fill="white" fillOpacity="0.01" />
                    
                    {/* Code Lines - Staggered opacities */}
                    <g opacity="0.7">
                      <rect x="80" y="70" width="40" height="4" rx="2" fill="white" fillOpacity="0.3" />
                      <rect x="130" y="70" width="60" height="4" rx="2" fill="white" fillOpacity="0.15" />
                      
                      <rect x="80" y="90" width="140" height="4" rx="2" fill="white" fillOpacity="0.15" />
                      <rect x="80" y="105" width="120" height="4" rx="2" fill="white" fillOpacity="0.15" />
                      
                      {/* Block Highlight */}
                      <rect x="80" y="130" width="140" height="60" rx="4" stroke="white" strokeOpacity="0.05" fill="white" fillOpacity="0.03" className="animate-pulse" />
                      <rect x="95" y="145" width="80" height="4" rx="2" fill="white" fillOpacity="0.25" />
                      <rect x="95" y="160" width="100" height="4" rx="2" fill="white" fillOpacity="0.15" />
                      <rect x="95" y="175" width="60" height="4" rx="2" fill="white" fillOpacity="0.15" />
                    </g>
                  </g>
                  
                  {/* Floating Elements - Smoother float */}
                  <rect x="220" y="60" width="40" height="40" rx="4" stroke="white" strokeOpacity="0.2" fill="black" className="group-hover:translate-x-3 group-hover:-translate-y-3 transition-transform duration-700 ease-out" />
                  <path d="M230 75 L240 85 L250 75" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" fill="none" className="group-hover:translate-x-3 group-hover:-translate-y-3 transition-transform duration-700 ease-out" />

                  {/* Subtle scan line over docs */}
                  <rect x="60" y="40" width="180" height="2" fill="url(#scan-gradient)" className="animate-[scan_8s_ease-in-out_infinite]" opacity="0.3" />
                </svg>
             </div>

            {/* Button */}
            <div className="absolute bottom-[40px] left-0 right-0 flex justify-center z-10">
              <Link
                href="https://docs.nex-t1.ai"
                className="box-border flex flex-row justify-center items-center px-4 py-1.5 gap-2 h-[34px] border border-white/25 rounded-full mix-blend-normal bg-black/20 backbackdrop-blur-lg hover:bg-white/10 transition-colors group-hover:border-white/50"
              >
                <span className="font-mono text-[14px] leading-[20px] tracking-[1.4px] uppercase text-white text-center">
                  Read Docs
                </span>
                <ArrowUpRight className="w-3 h-3 text-white" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Keyframes for scanning/dash animations if not present in global css */}
      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(200px); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); transform-origin: 150px 150px; }
          to { transform: rotate(360deg); transform-origin: 150px 150px; }
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
      `}</style>
    </section>
  );
}
