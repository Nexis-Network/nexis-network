"use client";

import React, { useState, useRef } from "react";

export function LandingV2TickerFooter() {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 384 lines * 11px gap = 4224px, enough to cover 4k screens
  const TOTAL_LINES = 384; 

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // 11px is the pitch (1px width + 10px gap)
    const index = Math.floor(x / 11);
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const getLineProps = (index: number) => {
    // Default styling (inactive)
    const defaultProps = { fill: "white", fillOpacity: 0.2, y: 0 };

    // Default to index 6 (original left position) if not hovering
    const targetIndex = hoverIndex === null ? 6 : hoverIndex;
    
    const dist = Math.abs(index - targetIndex);
    
    if (dist > 4) return defaultProps;
    
    // Wave pattern offsets (Active)
    let y = 0;
    if (dist === 0) y = 0;         // Center
    else if (dist === 1) y = 9.6001;
    else if (dist === 2) y = 16;
    else if (dist === 3) y = 19.2002;
    else if (dist === 4) y = 25.6001;
    
    return { fill: "#1DCAFF", fillOpacity: 1, y };
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-row items-start p-0 w-full h-[32px] z-[5] mt-8 pointer-events-auto cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ height: "32px" }}
    >
      <svg
        width="100%"
        height="32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {Array.from({ length: TOTAL_LINES }).map((_, i) => {
             const props = getLineProps(i);
             return (
                 <rect 
                    key={i} 
                    x={i * 11} 
                    y={props.y}
                    width="1" 
                    height="32" 
                    fill={props.fill} 
                    fillOpacity={props.fillOpacity}
                    style={{ transition: 'all 0.1s ease-out' }} 
                 />
             );
        })}
      </svg>
    </div>
  );
}
