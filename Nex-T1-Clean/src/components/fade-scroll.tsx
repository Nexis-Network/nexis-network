import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FadeScrollProps {
  children: React.ReactNode;
  className?: string;
}

const FadeScroll = ({ children, className }: FadeScrollProps) => {
  return (
    <div className={cn("relative flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <ScrollArea 
        className="flex-1 overflow-hidden"
        style={{
          // Keep a subtle edge fade while pushing the top fade area higher
          // so it does not overlay the first card by default.
          maskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 92%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 4%, black 92%, transparent 100%)",
        }}
      >
        <div className="space-y-4 p-0.5 pb-12">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
};


export { FadeScroll };
