"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AssetImageProps {
    src: string;
    fallbackSrc?: string | null;
    alt: string;
    width: number;
    height: number;
    className?: string;
    priority?: boolean;
    fallbackText?: string;
}

export function AssetImage({
    src,
    fallbackSrc,
    alt,
    width,
    height,
    className,
    priority,
    fallbackText,
}: AssetImageProps) {
    const [currentSrc, setCurrentSrc] = useState<string>(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setCurrentSrc(src);
        setHasError(false);
    }, [src]);

    const handleError = () => {
        if (currentSrc === src && fallbackSrc) {
            setCurrentSrc(fallbackSrc);
        } else {
            setHasError(true);
        }
    };

    if (hasError) {
        return (
            <div className={cn("flex items-center justify-center bg-[#161717] text-[#E8E8E3]/70", className)} style={{ width, height }}>
                <span className="text-[15.9px] font-light uppercase tracking-[0.16px]">
                    {fallbackText || alt.slice(0, 1)}
                </span>
            </div>
        );
    }

    return (
        <Image
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            className={className}
            style={{ width, height, maxWidth: "100%", maxHeight: "100%" }}
            priority={priority}
            onError={handleError}
            unoptimized={currentSrc.startsWith("https://raw.githubusercontent.com")}
        />
    );
}
