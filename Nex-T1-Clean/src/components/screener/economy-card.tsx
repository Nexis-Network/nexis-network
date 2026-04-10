"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

function SolidNexisLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 265 265" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M41.7388 223.325C41.7484 223.325 41.7575 223.328 41.7642 223.335C41.8216 223.391 41.8807 223.447 41.9406 223.503C42.2233 223.766 42.6927 223.723 42.9169 223.411L51.7269 211.17C60.0843 196.909 62.373 183 62.4606 171.56C62.4606 165.547 61.466 159.377 59.8869 153.486C58.7754 149.94 57.9566 146.279 57.43 142.59C57.43 142.561 57.43 142.504 57.43 142.447C57.0791 139.987 56.8451 137.471 56.7283 134.954C55.1196 94.4005 86.7469 60.9234 128.412 57.1078C136.89 57.365 152.049 59.6382 164.678 55.5349C177.168 52.0742 188.517 45.2428 198.031 36.5027C198.292 36.2629 198.81 36.0094 199.268 35.7524C199.954 35.3675 200.471 34.6628 201.046 34.1373L206.564 29.0998C207.14 28.5742 207.466 27.8449 207.466 27.0822V24.574C207.466 23.6697 207.009 22.8196 206.234 22.3064C170.881 -1.09731 124.612 -7.35643 82.1144 9.63335C14.6126 36.5738 -17.7345 111.96 9.84539 177.966C16.7477 194.469 26.7208 208.825 38.8875 220.637C39.8201 221.549 40.7528 222.431 41.7142 223.315C41.7208 223.321 41.7297 223.325 41.7388 223.325Z" fill="#c4c4c4"/>
      <path d="M222.508 38.8219C222.499 38.8219 222.49 38.8182 222.483 38.8117C222.426 38.7556 222.367 38.6994 222.308 38.6431C222.028 38.3779 221.558 38.4216 221.336 38.7337L212.568 51.0796C204.25 65.4626 201.973 79.4901 201.886 91.0274C201.886 97.091 202.875 103.313 204.447 109.255C205.553 112.831 206.368 116.523 206.892 120.244C206.892 120.273 206.892 120.33 206.892 120.388C207.241 122.869 207.474 125.407 207.59 127.945C209.191 168.843 177.715 202.605 136.249 206.453C127.813 206.194 112.726 203.901 100.157 208.04C87.7274 211.53 76.4319 218.419 66.9639 227.234C66.7021 227.478 66.1801 227.736 65.7215 227.997C65.0443 228.383 64.5395 229.086 63.9723 229.611L58.4617 234.709C57.8945 235.233 57.5741 235.957 57.5741 236.713V239.287C57.5741 240.186 58.0249 241.031 58.7916 241.545C93.9758 265.153 140.028 271.468 182.326 254.332C249.505 227.162 281.697 151.134 254.249 84.5662C247.38 67.9231 237.454 53.4449 225.346 41.5326C224.418 40.6131 223.489 39.7232 222.533 38.8314C222.526 38.8253 222.517 38.8219 222.508 38.8219Z" fill="#c4c4c4"/>
    </svg>
  );
}

export function EconomyCard() {
  return (
    <div className="w-full h-full min-h-[400px] bg-[#AE94FB] rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <h3 className="text-[28px] font-medium leading-tight text-white tracking-tight">
          Create your own economy
        </h3>
        <motion.div 
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="w-2 h-2 bg-[#9EFFB3] rounded-full shrink-0 mt-2" 
        />
      </div>

      {/* Grid Content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="grid grid-cols-3 gap-3 p-4 scale-90 md:scale-100">
          {[...Array(9)].map((_, i) => {
            // Center Item (Index 4)
            if (i === 4) {
              return (
                <motion.div 
                  key={i}
                  animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 0 0px rgba(158, 255, 179, 0)", "0 0 0 8px rgba(158, 255, 179, 0.2)", "0 0 0 0px rgba(158, 255, 179, 0)"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 bg-[#9EFFB3] rounded-[14px] relative flex items-center justify-center shadow-lg shadow-[#9EFFB3]/20 z-30"
                >
                  {/* Logo 1: Clockwise Grid Traversal */}
                  <motion.div
                      className="absolute inset-0 flex items-center justify-center z-40"
                      animate={{ 
                          x: [0, 0, 76, 76, 76, 0, -76, -76, -76, 0, 0],
                          y: [0, -76, -76, 0, 76, 76, 76, 0, -76, -76, 0],
                          rotate: [0, 0, 90, 180, 180, 270, 270, 360, 360, 0, 0]
                      }}
                      transition={{ 
                          duration: 12, 
                          repeat: Infinity, 
                          times: [0, 0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1],
                          ease: "easeInOut" 
                      }}
                  >
                      <SolidNexisLogo className="w-8 h-8" />
                  </motion.div>

                  {/* Logo 2: Counter-Clockwise Grid Traversal */}
                  <motion.div
                      className="absolute inset-0 flex items-center justify-center z-40"
                      animate={{ 
                          x: [0, 0, -76, -76, -76, 0, 76, 76, 76, 0, 0],
                          y: [0, 76, 76, 0, -76, -76, -76, 0, 76, 76, 0],
                          rotate: [0, 0, -90, -180, -180, -270, -270, -360, -360, 0, 0]
                      }}
                      transition={{ 
                          duration: 12, 
                          repeat: Infinity, 
                          times: [0, 0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1],
                          ease: "easeInOut"
                      }}
                  >
                      <Image 
                        src="/logo/nexis-logo-only.svg" 
                        alt="Nexis Logo" 
                        width={32} 
                        height={32} 
                        className="w-8 h-8"
                      />
                  </motion.div>
                </motion.div>
              );
            }



            // Hardcode the animation arrays for perfect sync
            const PURPLE = "#8E71E3";
            const GREEN = "#9EFFB3"; 
            
            // Default inactive
            let bgValues = [PURPLE, PURPLE];
            let timeValues = [0, 1];

            switch(i) {
                case 0: // Top Left (Hits: 0.35, 0.75)
                    bgValues = [PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0, 0.3, 0.35, 0.45, 0.7, 0.75, 0.85]; 
                    break;
                case 1: // Top Center (Hits: 0.05, 0.45, 0.85)
                    bgValues = [GREEN, PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0.05, 0.15, 0.4, 0.45, 0.55, 0.8, 0.85, 0.95];
                    // Handle wrap around for smooth loop? L1 starts at center, hits 1 at 0.05.
                    break;
                case 2: // Top Right (Hits: 0.15, 0.55)
                    bgValues = [PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0, 0.1, 0.15, 0.25, 0.5, 0.55, 0.65];
                    break;
                case 3: // Mid Left (Hits: 0.25, 0.65)
                    bgValues = [PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0, 0.2, 0.25, 0.35, 0.6, 0.65, 0.75];
                    break;
                // 4 is Center
                case 5: // Mid Right (Hits: 0.25, 0.65)
                    bgValues = [PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0, 0.2, 0.25, 0.35, 0.6, 0.65, 0.75];
                    break;
                case 6: // Bottom Left (Hits: 0.15, 0.55)
                    bgValues = [PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0, 0.1, 0.15, 0.25, 0.5, 0.55, 0.65];
                    break;
                case 7: // Bottom Center (Hits: 0.05, 0.45, 0.85)
                    bgValues = [GREEN, PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0.05, 0.15, 0.4, 0.45, 0.55, 0.8, 0.85, 0.95];
                    break;
                case 8: // Bottom Right (Hits: 0.35, 0.75)
                    bgValues = [PURPLE, PURPLE, GREEN, PURPLE, PURPLE, GREEN, PURPLE];
                    timeValues = [0, 0.3, 0.35, 0.45, 0.7, 0.75, 0.85];
                    break;
            }

            return (
              <motion.div 
                key={i}
                animate={{ backgroundColor: bgValues, scale: [0.95, 1, 0.95] }}
                transition={{ 
                    backgroundColor: { duration: 12, repeat: Infinity, times: timeValues, ease: "linear" },
                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-16 h-16 rounded-[14px]" // Base bg logic handled by animation
                style={{ backgroundColor: PURPLE }}
              />
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="z-10 relative mt-auto">
        <p className="text-white font-medium text-[16px] leading-snug opacity-90 max-w-[90%]">
          Use a centralised currency for payments and transact with your fungible token
          regardless of liquidity or value.
        </p>
      </div>
    </div>
  );
}
