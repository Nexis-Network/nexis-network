import { cn } from "@/lib/utils";
import React from "react";

export function MenuGridIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("group cursor-pointer flex items-center justify-center p-1 border border-white/30 rounded-md", className)} {...props}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full overflow-visible"
      >
        {[
            { x: 3, y: 3, delay: "0s" },
            { x: 11, y: 3, delay: "0.05s" },
            { x: 18.8, y: 3, delay: "0.10s" },
            { x: 3, y: 11, delay: "0.05s" },
            { x: 11, y: 11, delay: "0.10s" },
            { x: 18.8, y: 11, delay: "0.15s" },
            { x: 3, y: 19, delay: "0.10s" },
            { x: 11, y: 19, delay: "0.15s" },
            { x: 18.8, y: 19, delay: "0.20s" }
        ].map((rect, i) => (
             <rect
                key={i}
                x={rect.x}
                y={rect.y}
                width="2.2"
                height="2"
                rx="0.5"
                className="fill-current transition-all duration-[400ms] ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:fill-[#00f2ff] group-hover:scale-[1.4] group-hover:rotate-90 group-active:scale-[0.8] group-active:fill-[#ff007a] origin-center"
                style={{
                    transitionDelay: rect.delay,
                    transformBox: "fill-box",
                    transformOrigin: "center"
                }}
             />
        ))}
      </svg>
    </div>
  )
}
