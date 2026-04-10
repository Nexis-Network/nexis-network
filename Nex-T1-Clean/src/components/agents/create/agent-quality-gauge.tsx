"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Orb } from "@/components/ui/orb";
import { Button } from "@/components/ui/button";

interface AgentQualityGaugeProps {
  score: number;
  value?: string;
  onChange?: (value: string) => void;
}

// Color Palette Definitions
// Format: [Label, [Color1, Color2]]
const ORB_COLORS: { label: string; colors: [string, string] }[] = [
  { label: "Default", colors: ["#0B4F83", "#22D3EE"] },
  { label: "Mint", colors: ["#34d399", "#10b981"] },
  { label: "Neon Green", colors: ["#39ff14", "#22c55e"] },
  { label: "Neon Yellow", colors: ["#ccff00", "#a3e635"] },
  { label: "Orange", colors: ["#f97316", "#ea580c"] },
  { label: "Slate", colors: ["#475569", "#1e293b"] },
  { label: "Red", colors: ["#dc2626", "#991b1b"] },
  { label: "Lime", colors: ["#a3e635", "#65a30d"] },
  { label: "Emerald", colors: ["#34d399", "#059669"] },
  { label: "Cyan", colors: ["#22d3ee", "#0891b2"] },
  { label: "Blue", colors: ["#3b82f6", "#1d4ed8"] },
  { label: "Indigo", colors: ["#4f46e5", "#3730a3"] },
  { label: "Pink", colors: ["#db2777", "#be185d"] },
];

export function AgentQualityGauge({ score, value, onChange }: AgentQualityGaugeProps) {
  // Determine initial index based on passed value value (orb:color1,color2)
  const initialIndex = useMemo(() => {
    if (!value || !value.startsWith("orb:")) return 0;
    const colorsStr = value.replace("orb:", "");
    // Try to find matching color set
    const idx = ORB_COLORS.findIndex(c => c.colors.join(",") === colorsStr);
    return idx !== -1 ? idx : 0;
  }, [value]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [hoverScore, setHoverScore] = useState<number | null>(null);

  // Sync internal state if value prop changes externally
  useEffect(() => {
     if (!value || !value.startsWith("orb:")) return;
     const colorsStr = value.replace("orb:", "");
     const idx = ORB_COLORS.findIndex(c => c.colors.join(",") === colorsStr);
     if (idx !== -1 && idx !== currentIndex) {
         setCurrentIndex(idx);
     }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrev = () => {
    const newIndex = (currentIndex - 1 + ORB_COLORS.length) % ORB_COLORS.length;
    setCurrentIndex(newIndex);
    notifyChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % ORB_COLORS.length;
    setCurrentIndex(newIndex);
    notifyChange(newIndex);
  };

  const notifyChange = (index: number) => {
    if (onChange) {
        const colorSet = ORB_COLORS[index];
        onChange(`orb:${colorSet.colors.join(",")}`);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Calculate angle in degrees (0 at top, increasing clockwise)
    // atan2(y, x) gives angle from X axis (right). 
    // We want 0 at Top (-90 in standard).
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    // Convert angle to score (0-100)
    // Map 0-360 degrees to 0-100 score
    const newScore = Math.min(100, Math.max(0, (angle / 360) * 100));
    setHoverScore(newScore);
  };

  const handleMouseLeave = () => {
    setHoverScore(null);
  };

  // Generate 60 ticks for 360 degrees (6 degrees per tick)
  const ticks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => i * 6);
  }, []);

  const currentScore = hoverScore !== null ? hoverScore : score;
  const activeTicks = Math.floor((currentScore / 100) * 60);
  const currentColorSet = ORB_COLORS[currentIndex].colors;

  return (
    <div 
        className="relative w-[300px] h-[300px] flex items-center justify-center select-none font-sans cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
    >
      
      {/* SVG Indicators (Curved Lines & Text) - Moved further out for wider ticks */}
      <div className="absolute inset-0 pointer-events-none z-30">
         {/* Best - 10 Tools (Top Left) */}
         <div className="absolute top-[-15px] left-[-70px] w-[130px] text-right opacity-80 mix-blend-plus-lighter">
             <span className="text-[10px] text-white block font-medium">Best</span>
             <span className="text-[10px] text-[#A1A1AA] block">10 Tools</span>
             <svg width="80" height="40" className="absolute top-6 right-0 text-[#A1A1AA] stroke-current fill-none opacity-60">
                 <path d="M70,0 Q70,20 40,20 T0,35" strokeWidth="1" />
             </svg>
         </div>

         {/* Good - System Prompt (Top Right) */}
         <div className="absolute top-[-25px] right-[-70px] w-[130px] text-left opacity-80 mix-blend-plus-lighter">
             <span className="text-[10px] text-white block font-medium">Good</span>
             <span className="text-[10px] text-[#A1A1AA] block">System prompt</span>
              <svg width="60" height="40" className="absolute top-6 left-0 text-[#A1A1AA] stroke-current fill-none opacity-60">
                 <path d="M0,0 Q0,20 30,20" strokeWidth="1" />
             </svg>
         </div>

         {/* Better - Model selected (Bottom Right) */}
         <div className="absolute bottom-[-5px] right-[-90px] w-[130px] text-left opacity-80 mix-blend-plus-lighter">
              <svg width="60" height="40" className="absolute bottom-8 left-0 text-[#A1A1AA] stroke-current fill-none opacity-60">
                 <path d="M0,30 Q0,10 40,10" strokeWidth="1" />
             </svg>
             <span className="text-[10px] text-white block mt-8 font-medium">Better</span>
             <span className="text-[10px] text-[#A1A1AA] block">Model selected</span>
         </div>
         
          {/* Perfect Label (Bottom Center) - Moved down slightly */}
         <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 text-center z-40">
             <span className="text-[12px] font-semibold text-white tracking-widest uppercase drop-shadow-md">Perfect</span>
         </div>
      </div>

      {/* TICKS LAYER - Increased size & brightness */}
      <div className="absolute inset-0 z-20 w-full h-full flex items-center justify-center pointer-events-none">
        {ticks.map((deg, i) => {
            const isActive = i < activeTicks;
            const delay = i * 0.005; 

            return (
                <motion.div
                    key={deg}
                    initial={{ opacity: 0 }}
                    animate={{ 
                        opacity: isActive ? 0.8 : 0.3, 
                        backgroundColor: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.2)",
                        height: isActive ? "18px" : "9px" 
                    }}
                    transition={{ duration: 0.2, delay }}
                    className="absolute w-[4.5px] rounded-full origin-bottom" // Width increased by 50% (3px -> 4.5px)
                    style={{
                        left: 'calc(50% - 2.25px)', // Centered for 4.5px
                        top: '4px', 
                        transformOrigin: '50% 146px', // Radius ~146px
                        transform: `rotate(${deg}deg)`
                    }}
                />
            );
        })}
      </div>

      {/* CENTRAL ORB CAROUSEL */}
      {/* Container reduced size/scale, no overlays, centered */}
      <div className="absolute inset-0 z-10 w-full h-full flex items-center justify-center">
           <div className="relative w-[220px] h-[220px] flex items-center justify-center group"> {/* Added group for hover effects if needed */}
               
               {/* Left Arrow - Moved outside (>220px container + padding) */}
               <div className="absolute left-[-80px] z-50 pointer-events-auto">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handlePrev}
                        className="text-white/30 hover:text-white hover:bg-white/5 rounded-full w-12 h-12 transition-all" // 50% larger (was 8/4=2rem=32px -> 12/4=3rem=48px)
                    >
                        <ChevronLeft className="w-8 h-8" /> {/* 50% larger (was 6 -> 8) */}
                    </Button>
               </div>

               {/* The Orb */}
               <div className="w-full h-full rounded-full overflow-hidden relative shadow-[inset_0_0_20px_#0f0f10]">
                   {/* We only render ONE orb, the active one. */}
                   <Orb 
                      key={currentIndex} 
                      colors={currentColorSet}
                      variant="user" 
                      className="w-full h-full opacity-100"
                      agentState={score > 5 ? "talking" : "listening"}
                    />
                   {/* Inner shadow overlay - Ensures it sits on top of canvas */}
                   <div className="absolute inset-0 rounded-full shadow-[inset_0_0_50px_#0f0f10] pointer-events-none" />
               </div>

                {/* Right Arrow - Moved outside */}
               <div className="absolute right-[-80px] z-50 pointer-events-auto">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleNext}
                        className="text-white/30 hover:text-white hover:bg-white/5 rounded-full w-12 h-12 transition-all"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </Button>
               </div>

           </div>
      </div>
    </div>
  );
}
