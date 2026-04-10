"use client";

import { useMemo } from "react";
import Image from "next/image";
import { LazyOrb } from "@/components/ui/lazy-orb";
import { cn } from "@/lib/utils";
import { getOrbColors } from "@/lib/marketplace/utils";
import { resolveAvatarImageSrc } from "@/lib/avatar-image-fallback";

interface AgentAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  orbClassName?: string;
  imageClassName?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  enableOrb?: boolean;
}

export function AgentAvatar({
  src,
  name,
  className,
  orbClassName,
  imageClassName,
  fill = false,
  width,
  height,
  sizes,
  priority = false,
  enableOrb = true,
}: AgentAvatarProps) {
  const orbColors = useMemo(() => {
    if (!enableOrb) return null;
    return getOrbColors(src);
  }, [src, enableOrb]);

  const showOrb = !!orbColors || (!src && enableOrb);
  
  // Generate deterministic colors if no src provided
  const generatedColors = useMemo(() => {
    if (orbColors) return orbColors;
    if (!src && name) {
      // Simple hash to generated colors
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const c1 = `hsl(${Math.abs(hash % 360)}, 70%, 60%)`;
      const c2 = `hsl(${Math.abs((hash + 40) % 360)}, 70%, 50%)`;
      return [c1, c2] as [string, string];
    }
    return null;
  }, [orbColors, src, name]);

  const finalOrbColors = generatedColors;
  const safeSrc = resolveAvatarImageSrc(src, name.replace(/\s+/g, ""));

  if (finalOrbColors) {
    if (showOrb) {
       return (
        <div 
          className={cn(
            "overflow-hidden flex items-center justify-center bg-muted/40",
            fill ? "absolute inset-0 w-full h-full" : "relative", 
            className
          )}
        >
          <div className={cn("w-full h-full transform scale-150", orbClassName)}>
            <LazyOrb colors={finalOrbColors} variant="agent" />
          </div>
        </div>
      );
    }
    
    // Gradient Fallback
    return (
      <div 
        className={cn(
          "overflow-hidden flex items-center justify-center",
          fill ? "absolute inset-0 w-full h-full" : "relative w-full h-full", 
          className
        )}
        style={{
          background: `linear-gradient(135deg, ${finalOrbColors[0]}, ${finalOrbColors[1]})`
        }}
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={safeSrc}
        alt={name}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn("object-cover", imageClassName)}
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}
