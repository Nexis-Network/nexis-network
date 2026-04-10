"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import { LandingV2TickerFooter } from "./landing-v2-ticker-footer";

// --- Icons / SVGs ---

const IconLooper = () => (
    <svg width="100%" height="100%" viewBox="0 0 238 238" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25.83 113.66H195.9a5.172 5.172 0 0 1 5.16 5.17 5.168 5.168 0 0 1-5.16 5.17H25.83a25.812 25.812 0 0 0-18.271 7.566A25.819 25.819 0 0 0 0 149.84v62a25.816 25.816 0 0 0 15.946 23.858 25.825 25.825 0 0 0 9.884 1.962h186a25.835 25.835 0 0 0 18.268-7.562 25.832 25.832 0 0 0 7.562-18.268A25.83 25.83 0 0 0 211.83 186H41.72a5.158 5.158 0 0 1-5.16-5.16 5.164 5.164 0 0 1 3.18-4.785 5.152 5.152 0 0 1 1.98-.395h170.07a25.835 25.835 0 0 0 18.268-7.562 25.832 25.832 0 0 0 7.562-18.268v-62a25.836 25.836 0 0 0-1.963-9.886A25.819 25.819 0 0 0 211.79 62H41.72a5.17 5.17 0 0 1-5.16-5.17 5.16 5.16 0 0 1 5.16-5.17h170.07a25.834 25.834 0 0 0 23.864-15.945 25.832 25.832 0 0 0 1.966-9.885 25.836 25.836 0 0 0-1.963-9.886A25.82 25.82 0 0 0 211.79 0h-186A25.82 25.82 0 0 0 0 25.87v62a25.82 25.82 0 0 0 25.83 25.79Z" fill="#fff"/>
    </svg>
);

const IconPassive = () => (
    <svg width="100%" height="100%" viewBox="0 0 238 238" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M118.81 237.62a23.76 23.76 0 0 1-23.76-23.76v-47.53a23.76 23.76 0 0 0-23.76-23.76H23.76a23.76 23.76 0 1 1 0-47.52h47.53a23.76 23.76 0 0 0 23.76-23.76V23.76a23.76 23.76 0 0 1 47.52 0v47.53a23.76 23.76 0 0 0 23.76 23.76h47.53a23.76 23.76 0 1 1 0 47.52h-47.53a23.76 23.76 0 0 0-23.76 23.76v47.53a23.76 23.76 0 0 1-23.76 23.76Z" fill="#fff"/>
    </svg>
);

const IconTrader = () => (
    <svg width="100%" height="100%" viewBox="0 0 113 113" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g style={{ mixBlendMode: 'overlay' }}>
            <path d="M0 57.2211H46.2648C48.7872 57.2211 51.2063 58.2231 52.9899 60.0067C54.7735 61.7903 55.7755 64.2094 55.7755 66.7318V112.997H0V57.2211Z" fill="white" fillOpacity="0.6"/>
            <path d="M57.2207 113.001L113.001 57.2211H66.7314C64.209 57.2211 61.7899 58.2231 60.0063 60.0067C58.2227 61.7903 57.2207 64.2094 57.2207 66.7318V113.001Z" fill="white" fillOpacity="0.6"/>
            <path d="M0 55.7755H46.2648C48.7872 55.7755 51.2063 54.7735 52.9899 52.9899C54.7735 51.2063 55.7755 48.7872 55.7755 46.2648V0L0 55.7755Z" fill="white" fillOpacity="0.6"/>
            <path d="M57.2207 0H113.001V55.7755H66.7314C64.209 55.7755 61.7899 54.7735 60.0063 52.9899C58.2227 51.2063 57.2207 48.7872 57.2207 46.2648V0Z" fill="white" fillOpacity="0.6"/>
        </g>
    </svg>
);

const IconDex = () => (
    <svg width="100%" height="100%" viewBox="0 0 238 238" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M237.63 71.29a23.76 23.76 0 0 0-23.76-23.76 23.762 23.762 0 0 1-23.77-23.77 23.76 23.76 0 1 0-47.52 0 23.76 23.76 0 0 1-23.76 23.76 23.762 23.762 0 0 1-23.77-23.76 23.76 23.76 0 0 0-47.52 0 23.761 23.761 0 0 1-23.76 23.76A23.76 23.76 0 0 0 0 71.28a23.76 23.76 0 0 0 23.76 23.77 23.76 23.76 0 0 1 0 47.52A23.76 23.76 0 0 0 0 166.33a23.763 23.763 0 0 0 14.665 21.96 23.755 23.755 0 0 0 9.095 1.81 23.76 23.76 0 0 1 23.76 23.76 23.76 23.76 0 1 0 47.52 0 23.76 23.76 0 1 1 47.52 0 23.76 23.76 0 1 0 47.52 0 23.76 23.76 0 0 1 23.76-23.76 23.76 23.76 0 1 0 0-47.52 23.76 23.76 0 1 1 0-47.52 23.758 23.758 0 0 0 23.79-23.77Zm-118.81 71.28a23.76 23.76 0 1 1-.001-47.518 23.76 23.76 0 0 1 .001 47.518Z" fill="#fff"/>
    </svg>
);

const BackgroundGlow = ({ hueRotate = 0 }: { hueRotate?: number }) => (
    <svg width="100%" height="100%" viewBox="0 0 1597 339" preserveAspectRatio="none" style={{ filter: `hue-rotate(${hueRotate}deg)` }}>
        <defs>
            <filter id="glow_filter0_f" x="-101.971" y="-153.489" width="1800.89" height="645.977" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                <feGaussianBlur stdDeviation="76.7443" result="effect1_foregroundBlur"/>
            </filter>
            <filter id="glow_filter1_f" x="-104.491" y="116.78" width="1805.92" height="315.363" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                <feGaussianBlur stdDeviation="52.2456" result="effect1_foregroundBlur"/>
            </filter>
            <filter id="glow_filter2_f" x="69.3704" y="64.6459" width="1458.2" height="374.244" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                <feGaussianBlur stdDeviation="49.9447" result="effect1_foregroundBlur"/>
            </filter>
        </defs>
        <g style={{ mixBlendMode: 'hard-light', filter: 'url(#glow_filter0_f)' }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M78.8538 0C166.606 112.634 455.554 195.277 798.473 195.277C1141.39 195.277 1430.34 112.634 1518.09 0.00011968C1535.91 22.8649 1545.43 46.9656 1545.43 71.8618C1545.43 219.398 1211.01 339 798.473 339C385.941 339 51.5171 219.398 51.5171 71.8617C51.5171 46.9655 61.0398 22.8648 78.8538 0Z" fill="#D83EFF"/>
        </g>
        <g style={{ mixBlendMode: 'color-dodge', filter: 'url(#glow_filter1_f)' }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M1567.72 221.272C1586.76 228.447 1596.94 236.01 1596.94 243.822C1596.94 290.12 1239.45 327.652 798.471 327.652C357.488 327.652 -6.01894e-06 290.12 -1.97143e-06 243.822C-1.28844e-06 236.01 10.1793 228.447 29.2216 221.272C123.026 256.617 431.901 282.551 798.471 282.551C1165.04 282.551 1473.92 256.617 1567.72 221.272Z" fill="#B0B0B0"/>
        </g>
        <g style={{ mixBlendMode: 'plus-lighter', filter: 'url(#glow_filter2_f)' }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M192.287 164.535C266.207 222.501 509.606 265.033 798.468 265.033C1087.33 265.033 1330.73 222.501 1404.65 164.535C1419.66 176.303 1427.68 188.706 1427.68 201.519C1427.68 277.448 1145.97 339 798.468 339C450.966 339 169.259 277.447 169.259 201.519C169.259 188.706 177.281 176.303 192.287 164.535Z" fill="#B0B0B0"/>
        </g>
    </svg>
);


// --- Components ---

type TabType = "looper" | "passive" | "trader" | "dex";

interface TabProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const Tab = ({ label, isActive, onClick }: TabProps) => {
    return (
        <div 
            className="flex flex-col items-start p-0 gap-[9.6px] w-[155.6px] h-[29.12px] cursor-pointer"
            onClick={onClick}
        >
             {/* Divider */}
             <motion.div 
                className="w-[155.6px] h-[1.6px] rounded-[4px]"
                animate={{
                    backgroundColor: isActive ? "#0ea5e9" : "rgba(255, 255, 255, 0.6)", // sky-500 for active
                    opacity: isActive ? 1 : 0.12
                }}
                transition={{ duration: 0.3 }}
            />
            
            {/* Label Container */}
            <div className="flex flex-col justify-center items-center w-[155.6px] h-[17.92px]">
                 <motion.p 
                    className="font-sans font-normal text-[11.6px] leading-[18px] flex items-center text-center tracking-[-0.128px]"
                    animate={{
                        color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)" // Adjust inactive color slightly if needed, code says standard text color but opacity implies fading
                    }}
                >
                    {label}
                </motion.p>
            </div>
        </div>
    );
};


interface CardContent {
    id: TabType;
    title: string;
    description: string;
    Icon: React.FC;
    hueRotate: number;
}

const CONTENTS: CardContent[] = [
    {
        id: "looper",
        title: "For Nex-T1 Users",
        description: "Stop fighting the UI. Start commanding capital. Nex-T1 translates your natural language intent into complex, autonomous on-chain execution. Bridge, swap, and stake without lifting a finger.",
        Icon: IconLooper,
        hueRotate: 273,
    },
    {
        id: "passive",
        title: "For Node Operators",
        description: "The engine of the agentic economy. Monetize your hardware by powering verifiable TEE workloads. Nexis Orchestrator handles the complexity; you provide the compute and capture the network yield.",
        Icon: IconPassive,
        hueRotate: 222,
    },
    {
        id: "trader",
        title: "For MCP Builders",
        description: "Give your AI hands. The Nex Model Context Protocol connects LLMs to live blockchain tools instantly. Deploy production-grade agents that can read, write, and sign transactions—from local to mainnet.",
        Icon: IconTrader, // Assuming this maps to a 'Builder/Code' icon
        hueRotate: 0 // Default
    },
    {
        id: "dex",
        title: "For Ecosystems",
        description: "Liquidity that never sleeps. Integrate with Nexis to unlock 24/7 autonomous volume from thousands of active agents. Transform static TVL into dynamic, reasoning capital.",
        Icon: IconDex,
        hueRotate: 96,
    }
];

// SVG for the grid graphic in the card


export function LandingV2FAQ() {
    const [activeTab, setActiveTab] = useState<TabType>("looper");

    return (
        <section 
            className="relative flex flex-col justify-center items-center pt-[16.3px] px-[10px] pb-0 w-full min-w-full bg-[#0f0f10]"
            style={{ width: "100%", maxWidth: "1506px", height: "563px" }}
        >
            <div className="flex flex-col justify-center items-start p-0 w-full max-w-4xl h-auto">
                 {/* Content Wrapper */}
                <div className="flex flex-col items-center px-[24px] gap-[74.19px] w-full h-auto">
                    
                    {/* Tabs Row - Scrollable on mobile */}
                    <div className="flex flex-row items-start gap-[11.2px] w-full max-w-[656px] h-auto overflow-x-auto no-scrollbar pr-4">
                         {CONTENTS.map((item) => (
                            <Tab 
                               key={item.id}
                               label={`LTs ${item.title.replace("For ", "for ")}`} // Match tab label format "LTs for ..."
                               isActive={activeTab === item.id}
                               onClick={() => setActiveTab(item.id)}
                            />
                         ))}
                    </div>

                    {/* Cards Row - Carousel */}
                    <div className="flex flex-col md:flex-row items-center gap-[19.2px] w-full max-w-[921px] h-auto relative">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {CONTENTS.map((item) => {
                                const isActive = activeTab === item.id;
                                
                                // We render all cards, but animate their state
                                // Actually, for a proper carousel with "order" mentioned in CSS, 
                                // we might want to just map them in order. 
                                // But to match the visual of one big active one and others small:
                                
                                return (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        className={cn(
                                            "flex flex-col items-start p-0 rounded-[24px] relative overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-300",
                                            isActive ? "w-full md:w-[308.57px] h-[310.44px] z-10" : "w-full md:w-[185.14px] h-[292.81px] opacity-20 hidden md:flex"
                                        )}
                                        onClick={() => setActiveTab(item.id)}
                                        animate={{
                                            // on mobile only show active? or stack? 'hidden md:flex' handles hiding inactive on mobile for simplicity, or we can stack them.
                                            // Let's rely on CSS media queries primarily, but motion needs specific values.
                                            // width: isActive ? "308.57px" : "185.14px", 
                                            // We will override with CSS classes where possible, or use window width check (hard in SSR).
                                            // For now, let's keep desktop animation logic but effectively disable it on mobile via CSS or accept it might be weird.
                                            // Better: Use layoutId or just stack them on mobile without animation.
                                            opacity: isActive ? 1 : 0.22,
                                            filter: isActive ? "blur(0px)" : "blur(3.5px)",
                                            zIndex: isActive ? 10 : 0,
                                        }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 300, 
                                            damping: 30 
                                        }}
                                        style={{
                                            background: "rgba(255, 255, 255, 0.002)",
                                            boxShadow: isActive 
                                                ? "0px 0.6px 3px rgba(0,0,0,0.01), 0px 2.3px 11.4px rgba(0,0,0,0.03), 0px 10px 50px rgba(0,0,0,0.12), 0px 0.6px 3px -1px rgba(0,0,0,0.59)"
                                                : "0px 0.6px 3px rgba(0,0,0,0.01), 0px 2.3px 11.4px rgba(0,0,0,0.03)"
                                        }}
                                    >
                                        {/* Inner Content - changes layout based on active state too */}
                                        <div className="absolute inset-0 bg-black flex flex-col items-start overflow-hidden">
                                           
                                            {/* Background Glow - Moved to root for full coverage, fixed height to stop at title */ }
                                             <div className="absolute left-[-382px] right-[-363px] top-[-42px] h-[226px] z-[0]">
                                                 <BackgroundGlow hueRotate={item.hueRotate} />
                                             </div>

                                            {/* Top Section (Graphic + Title) */}
                                            <motion.div 
                                                className="flex flex-col relative z-[1]"
                                                animate={{
                                                    padding: isActive ? "19.2px" : "19.2px", // Constant padding
                                                    gap: isActive ? "21.8px" : "22.4px", // Slight gap change
                                                    height: isActive ? "182.6px" : "111.1px" // Explicit heights from CSS dump
                                                }}
                                            >
                                                {/* Graphic Wrapper */}
                                                <div className="w-[90.4px] h-[90.4px] relative flex-shrink-0">
                                                     {/* Icon */}
                                                     <div className="relative z-[2] w-full h-full">
                                                         <item.Icon />
                                                     </div>
                                                </div>

                                                {/* Title */}
                                                 <motion.div 
                                                    className="flex flex-col items-start p-0 z-[2]"
                                                    animate={{
                                                        width: isActive ? "270.17px" : "146.74px",
                                                        height: isActive ? "32px" : "63px",
                                                        opacity: isActive ? 1 : 1 // Ensure visibility
                                                    }}
                                                 >
                                                    <h3 className="font-sans font-medium text-[28.2px] leading-[31px] flex items-center tracking-[-1.4px] text-white">
                                                        {item.title}
                                                    </h3>
                                                 </motion.div>
                                            </motion.div>

                                            {/* Bottom Overlay Section */}
                                            <motion.div 
                                                className="flex flex-row justify-center items-start bg-white/5 relative z-[1]"
                                                animate={{
                                                    paddingTop: "18.6px",
                                                    paddingLeft: "24px",
                                                    paddingRight: "24px",
                                                    paddingBottom: "19.2px",
                                                    width: "100%", 
                                                    height: isActive ? "127.84px" : "181.71px", // Explicit heights: Total active 310, inactive 292
                                                    marginTop: "auto", 
                                                    borderRadius: isActive ? "0 0 24px 24px" : "0"
                                                }}
                                            >
                                                <div className="flex flex-col items-start p-0 w-full">
                                                    <p className="font-sans font-normal text-[11.8px] leading-[18px] flex items-center tracking-[-0.128px] text-white/46">
                                                        {isActive ? item.description : item.description.substring(0, 100) + (item.description.length > 100 ? "..." : "")}
                                                    </p>
                                                </div>
                                            </motion.div>

                                        </div>

                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                </div>
            </div>
            
            {/* Position Footer Absolutely at bottom center */}
            <div className="absolute bottom-0 left-0 w-full z-[5] pointer-events-none">
                <LandingV2TickerFooter />
            </div>
        </section>
    );
}
