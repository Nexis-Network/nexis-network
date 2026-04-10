"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface CodeTab {
  id: string;
  name: string;
  icon: LucideIcon;
}

export interface CodeSnippetLine {
  text: string;
  color?: string;
  indent: number;
}

interface GlassCodeBlockProps {
  tabs: CodeTab[];
  snippets: Record<string, CodeSnippetLine[]>;
  initialTab?: string;
  className?: string;
}

function DotsStackAnimation() {
  return (
    <div className="absolute inset-y-0 right-0 w-[200px] pointer-events-none overflow-hidden z-0">
      <div className="absolute right-8 bottom-16 flex gap-3">
        {[1, 2, 3].map((col) => (
          <div key={col} className="flex flex-col-reverse gap-3">
             {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
               <motion.div 
                 key={dot}
                 className="w-1.5 h-1.5 rounded-full bg-[#00E0C7]"
                 initial={{ opacity: 0.05, scale: 0.8 }}
                 animate={{ 
                   opacity: [0.05, 0.6, 0.05],
                   scale: [0.8, 1.2, 0.8]
                 }}
                 transition={{ 
                   duration: 3, 
                   repeat: Infinity, 
                   delay: col * 0.3 + dot * 0.15,
                   ease: "easeInOut"
                 }}
               />
             ))}
          </div>
        ))}
      </div>
      {/* Subtle glow behind dots */}
      <div className="absolute right-0 bottom-0 w-[150px] h-[150px] bg-[#00E0C7] opacity-10 blur-[60px] rounded-full" />
    </div>
  );
}

export function GlassCodeBlock({ tabs, snippets, initialTab, className }: GlassCodeBlockProps) {
  const [activeTab, setActiveTab] = useState(initialTab || tabs[0]?.id);

  return (
    <div className={cn("w-[652px] bg-[rgba(255,255,255,0.03)] backdrop-blur-[2px] rounded-[14px] p-[6px] border border-[rgba(255,255,255,0.04)] transition-colors duration-500 hover:border-[rgba(255,255,255,0.08)]", className)}>
      {/* Overlay Border Blend */}
      <div className="absolute inset-[5px] border border-[rgba(255,255,255,0.04)] rounded-[10px] mix-blend-overlay pointer-events-none" />
      
      {/* Dots Animation Overlay inside glass container */}
      <DotsStackAnimation />

      <div className="w-full bg-[#0C0D0D] rounded-[10px] overflow-hidden relative z-10">
        {/* Window Header / Tabs */}
        <div className="h-[50px] border-b border-white/5 flex items-center px-4 overflow-x-auto no-scrollbar gap-2 relative pointer-events-auto">
          {/* Fade masks for scroll */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#0C0D0D] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#0C0D0D] to-transparent z-10 pointer-events-none" />

          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center px-3 h-[30px] rounded-[6px] gap-1.5 shrink-0 border transition-all duration-300 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/20",
                activeTab === tab.id
                  ? "bg-[radial-gradient(64.39%_110%_at_50%_120%,#FFFFFF_27.27%,rgba(255,255,255,0.1)_69.23%)] border-transparent shadow-[0_0_9px_rgba(255,255,255,0.15)]"
                  : "bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10"
              )}
            >
              {/* Inner Black Bg for Active Tab border contrast */}
              {activeTab === tab.id && (
                <div className="absolute inset-[1px] bg-[#0C0D0D] rounded-[5px] -z-10" />
              )}
              
              <tab.icon className={cn("w-3.5 h-3.5 z-10", activeTab === tab.id ? "text-white" : "text-[#AFB1B6]")} />
              <span className={cn(
                "font-sans text-[14px] leading-[14px] tracking-[-0.56px] z-10",
                activeTab === tab.id
                  ? "bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50" 
                  : "text-[#AFB1B6]"
              )}>
                {tab.name}
              </span>
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="p-6 font-sans text-[12px] leading-[15px] h-[288px] overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-1.5"
            >
              {(snippets[activeTab] || snippets[Object.keys(snippets)[0]]).map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-[#4A4C52] select-none shrink-0 text-right pr-4">{i + 1}</span>
                  <span style={{ paddingLeft: `${line.indent * 24}px`, color: line.color || "#AFB1B6" }}>
                    {line.text}
                  </span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
