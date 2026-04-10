"use client";

import { useEffect, useState, useRef } from "react";

import { cn } from "@/lib/utils";

interface PriceCellProps {
    price: number | null | undefined;
    className?: string;
    positiveColor?: string;
    negativeColor?: string;
}

export function PriceCell({ 
    price, 
    className,
    positiveColor = "var(--screener-table-positive)",
    negativeColor = "var(--screener-table-negative)"
}: PriceCellProps) {
    const [flashState, setFlashState] = useState<"up" | "down" | null>(null);
    const prevPriceRef = useRef<number | null | undefined>(price);

    useEffect(() => {
        const prev = prevPriceRef.current;
        const current = price;

        if (prev != null && current != null && prev !== current) {
            setFlashState(current > prev ? "up" : "down");
            
            const timer = setTimeout(() => {
                setFlashState(null);
            }, 1000); // 1s flash duration (or less)

            return () => clearTimeout(timer);
        }
        
        prevPriceRef.current = current;
    }, [price]);

    const formatted = new Intl.NumberFormat("en-US", { 
        style: "currency", 
        currency: "USD", 
        maximumFractionDigits: (price && price < 1) ? 6 : 3 
    }).format(price || 0);

    const priceColor = flashState === "up" ? positiveColor : (flashState === "down" ? negativeColor : "inherit");

    return (
        <div className="relative inline-flex w-full items-center justify-end">
            {/* Value with inline flash background */}
            <span 
                className={cn(
                    "relative font-medium transition-colors duration-300 px-1.5 py-0.5 rounded",
                    className
                )}
                style={{ 
                    color: priceColor,
                    backgroundColor: flashState 
                        ? `color-mix(in oklab, ${flashState === "up" ? positiveColor : negativeColor} 15%, transparent)`
                        : "transparent"
                }}
            >
                {formatted}
            </span>
        </div>
    );
}
