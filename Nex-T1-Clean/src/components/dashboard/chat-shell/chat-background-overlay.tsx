import { memo } from "react";
import { cn } from "@/lib/utils";

export const ChatBackgroundOverlay = memo(function ChatBackgroundOverlay({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-5 pointer-events-none transition-opacity duration-500 ease-in-out",
        // Light theme
        "bg-[#c4c4c4]/10 backdrop-blur-[18px]",
        // Dark theme
        "dark:bg-[#0f0f10]/40 dark:shadow-[0px_0px_0px_0.5px_rgba(0,0,0,0.2)] dark:backdrop-blur-none rounded-tl-lg",
        className,
      )}
    />
  );
});
