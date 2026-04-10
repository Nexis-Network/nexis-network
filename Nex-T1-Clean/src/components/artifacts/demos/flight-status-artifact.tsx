"use client"

import { Plane } from "lucide-react"
import { Artifact } from "@/components/ai-elements/artifact"

export function FlightStatusArtifact() {
  return (
    <Artifact className="w-full max-w-md mx-auto overflow-visible">
       {/* 
          Container: 
          - Dark background #111111 (from image analysis)
          - Rounded corners ~24px
          - Border white/10ish
       */}
       <div className="relative w-full p-6 text-foreground dark:text-white">
          <div className="flex items-center justify-between">
             {/* Left: Origin */}
             <div className="flex flex-col items-start gap-1">
                <span className="text-4xl font-medium tracking-wide">LHR</span>
                <span className="text-xs text-muted-foreground/60 font-medium ml-0.5">London, UK</span>
                
                {/* Pill: DEP */}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                   <span>DEP</span>
                   <span className="text-white">20:50</span>
                   <span className="text-muted-foreground/50 text-[9px]">GMT+1</span>
                </div>
             </div>

             {/* Center: Progress Bar */}
             <div className="flex-1 px-6 flex items-center justify-center relative">
                {/* Track */}
                <div className="w-full h-[3px] bg-white/5 relative rounded-full overflow-hidden flex items-center">
                   {/* Progress: Solid White */}
                   <div className="h-full bg-white w-1/2 rounded-full z-10" />
                   {/* Remaining: Striped/Dashed? Image shows dashed/striped pattern for future path. 
                       I'll use a repeating linear gradient for the future path if possible, or just opacity.
                   */}
                   <div className="h-full flex-1 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#333_2px,#333_4px)] opacity-50" />
                </div>

                {/* Plane Icon: Positioned absolute at 50% */}
                <div className="absolute left-1/2 -translate-x-1/2 bg-[#111111] p-1 rounded-full z-20">
                    <Plane className="size-5 text-gray-400 fill-gray-600 rotate-90" />
                    {/* Status dots on wings? Image shows red/green dots on wings. 
                        I'll try to replicate subtly with pseudo elements or generic icon for now.
                        The Plane icon might need to be custom SVG to match perfectly.
                        Let's stick to Lucide Plane rotated for now.
                    */}
                </div>
             </div>

             {/* Right: Destination */}
             <div className="flex flex-col items-end gap-1">
                <span className="text-4xl font-medium tracking-wide">OPO</span>
                <span className="text-xs text-muted-foreground/60 font-medium mr-0.5">Porto, PT</span>

                {/* Pill: ETA */}
                 <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                   <span>ETA</span>
                   <span className="text-white">22:40</span>
                   <span className="text-muted-foreground/50 text-[9px]">GMT+1</span>
                </div>
             </div>
          </div>
       </div>
    </Artifact>
  )
}
