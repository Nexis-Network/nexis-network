"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function McpHero() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to Dark Mode asset to prevent hydration mismatch on server, 
  // or a neutral placeholder. Here we default to the dark asset.
  const isLight = mounted && resolvedTheme === "light";

  const src = isLight 
    ? "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/mcp-hero-light.svg"
    : "https://meribtk8qpfzbmbf.public.blob.vercel-storage.com/mcp-hero-dark.svg";

  return (
    <div className="w-full flex flex-col items-center pt-16 pb-16 overflow-visible translate-y-[15%]">
      {/* Main Hero Image */}
      <div className="relative w-full px-4 md:px-8 flex justify-center">
        <div className="relative w-full aspect-[3/1] md:aspect-[4/1] lg:aspect-[5/1] max-h-[500px]">
             <Image 
                key={src} // Force re-render on source change for animation restart if needed
                src={src} 
                alt="MCP Ecosystem" 
                fill
                className="object-contain object-center scale-[1.3] origin-center" 
                priority
                unoptimized
             />
        </div>
      </div>
      

    </div>
  );
}
