"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// --- Types ---
type Side = "left" | "right";

interface Hotspot {
    id: string;
    x: number; // 0-1
    y: number; // 0-1
    side: Side;
}

interface UtilityInfo {
    title: string;
    description: string;
}

// --- Data ---
const hotspots: Hotspot[] = [
    { id: "upper_left", x: 0.31, y: 0.34, side: "left" },
    { id: "lower_left", x: 0.36, y: 0.71, side: "left" },
    { id: "upper_right", x: 0.52, y: 0.38, side: "right" },
    { id: "mid_right", x: 0.56, y: 0.49, side: "right" },
    { id: "lower_right", x: 0.51, y: 0.75, side: "right" },
    { id: "bottom_left", x: 0.41, y: 0.80, side: "left" },
];

const utilities: Record<string, UtilityInfo> = {
    upper_left: {
        title: "Exclusive Access",
        description:
            "Enables exclusive access to our high performance Nex-T1 models for advanced AI tasks.",
    },
    lower_left: {
        title: "Reduced Fees",
        description:
            "Enjoy reduced fees on transactions when using the Nex-T1 app and ecosystem services.",
    },
    upper_right: {
        title: "Gas Fees",
        description:
            "Pays for on-chain gas fees on the Nexis AI chain, powering the decentralized network.",
    },
    mid_right: {
        title: "Node Validation",
        description:
            "Used for node validating to secure decentralized artificial intelligence operations.",
    },
    lower_right: {
        title: "Governance",
        description:
            "Participate in governance votes to shape the future of the Nexis Network protocol.",
    },
    bottom_left: {
        title: "Staking Rewards",
        description:
            "Stake NZT to earn yield and contribute to the security of the AI compute layer.",
    },
};

// --- Components ---

const LeaderLine = ({
    hotspot,
    info,
}: {
    hotspot: Hotspot;
    info: UtilityInfo;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // Configuration for line length and styling
    const lineLength = 15; // Percentage length of the line
    const isLeft = hotspot.side === "left";

    // Calculate start and end points (in percentages)
    // Start: The anchor point on the object
    const startX = hotspot.x * 100;
    const startY = hotspot.y * 100;

    // End: The hotspot location (outwards)
    // If left, subtract length. If right, add length.
    const endX = isLeft ? startX - lineLength : startX + lineLength;
    const endY = startY; // Horizontal line for simplicity

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* The Line */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
                <motion.line
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    x1={`${startX}%`}
                    y1={`${startY}%`}
                    x2={`${endX}%`}
                    y2={`${endY}%`}
                    stroke="#080808"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                {/* Optional: A small dot at the origin (anchor) */}
                <motion.circle
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    cx={`${startX}%`}
                    cy={`${startY}%`}
                    r="2"
                    fill="#080808"
                />
            </svg>

            {/* The Hotspot (Interactive Trigger) */}
            <div
                className="absolute pointer-events-auto flex items-center justify-center"
                style={{
                    left: `${endX}%`,
                    top: `${endY}%`,
                    transform: "translate(-50%, -50%)", // Center the hotspot on the end point
                }}
            >
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            className={cn(
                                "relative w-4 h-4 rounded-full bg-[#080808] shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#080808]",
                                "flex items-center justify-center"
                            )}
                            aria-label={`View details for ${info.title}`}
                        >
                            {/* Pulse effect */}
                            <span className="absolute inline-flex h-full w-full rounded-full bg-[#080808] opacity-20 animate-ping" />
                            {/* Inner dot */}
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </motion.button>
                    </PopoverTrigger>
                    <PopoverContent
                        side={isLeft ? "left" : "right"}
                        sideOffset={10}
                        className="w-64 p-4 text-left"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h4 className="mb-1 text-lg font-bold text-[var(--auth-menu-hover-fg)]">
                                {info.title}
                            </h4>
                            <p className="text-sm leading-relaxed text-[var(--auth-menu-muted)]">
                                {info.description}
                            </p>
                        </motion.div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};

export function NZTLeaderLines() {
    return (
        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
            {hotspots.map((hotspot) => (
                <LeaderLine
                    key={hotspot.id}
                    hotspot={hotspot}
                    info={
                        utilities[hotspot.id] || {
                            title: "Utility",
                            description: "Utility description.",
                        }
                    }
                />
            ))}
        </div>
    );
}
