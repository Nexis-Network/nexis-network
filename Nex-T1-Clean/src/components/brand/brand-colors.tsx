"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ColorSwatchProps = {
  name: string;
  value: string; // hex or specialized string
  className?: string; // for bg class if needed instead of style
  textClass?: string;
};

function ColorSwatch({ name, value, className, textClass = "text-white" }: ColorSwatchProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    // setTimeout(() => setCopied(false), 2000);
    // Use simple feedback instead of toast for now to be safe, or just visual change
     setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div 
        onClick={handleCopy}
        className="group relative flex flex-col gap-3 cursor-pointer"
    >
      <div
        className={cn(
            "relative w-full aspect-[4/3] rounded-2xl shadow-sm border border-white/5 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md overflow-hidden",
            className
        )}
        style={!className ? { background: value } : undefined}
      >
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        
        {/* Copy Icon / Feedback */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <div className="bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                {copied ? (
                    <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs font-medium text-white">Copied</span>
                    </>
                ) : (
                    <>
                        <Copy className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs font-medium text-white">Copy</span>
                    </>
                )}
             </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-1">
        <span className={cn("font-medium text-sm tracking-tight transition-colors group-hover:text-sky-400", textClass)}>{name}</span>
        <span className="text-white/40 font-mono text-[10px] uppercase tracking-wider">{value}</span>
      </div>
    </div>
  );
}

export function BrandColors() {
  return (
    <section className="w-full max-w-[1200px] px-8 py-24 flex flex-col gap-16 border-t border-white/5">
      {/* Header */}
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-sky-500/50" />
            <span className="text-sky-400 font-mono text-xs uppercase tracking-widest">Color Palette</span>
        </div>
        <h3 className="text-4xl font-sans font-medium text-white tracking-tight">
          System Colors
        </h3>
        <p className="text-white/60 text-lg leading-relaxed">
          Our color system is built on a foundation of deep, void-like backgrounds accented by vibrant, electric sky blues. 
          Use these precise values to maintain visual consistency.
        </p>
      </div>

      {/* Sky Scale */}
      <div className="flex flex-col gap-6">
        <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider font-mono">Brand Accents (Sky)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ColorSwatch 
                name="Sky 200" 
                value="#BAE6FD" // Tailwind sky-200
                className="bg-sky-200"
            />
            <ColorSwatch 
                name="Sky 300" 
                value="#7DD3FC" // Tailwind sky-300
                className="bg-sky-300"
            />
            <ColorSwatch 
                name="Sky 400" 
                value="#38BDF8" // Tailwind sky-400
                className="bg-sky-400"
            />
            <ColorSwatch 
                name="Sky 500" 
                value="#0EA5E9" // Tailwind sky-500
                className="bg-sky-500"
            />
        </div>
      </div>

      {/* Neutrals */}
       <div className="flex flex-col gap-6">
        <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider font-mono">Neutrals & Backgrounds</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ColorSwatch 
                name="Pure White" 
                value="#FFFFFF"
                className="bg-white"
            />
            <ColorSwatch 
                name="Off White" 
                value="#FAFAFA" // often used for very light backgrounds or subdued text
                className="bg-[#FAFAFA]"
            />
             <ColorSwatch 
                name="Nexis Black" 
                value="#0F0F10"
                className="bg-[#0F0F10]"
            />
            <ColorSwatch 
                name="Void Grey" 
                value="#1C1C1C"
                className="bg-[#1C1C1C]"
            />
        </div>
      </div>

       {/* Gradients */}
       <div className="flex flex-col gap-6">
        <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider font-mono">Signature Gradients</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ColorSwatch 
                name="Hero Glow" 
                value="linear-gradient(90deg, #000000 78%, #68EDFC 100%)" 
                className="bg-gradient-to-r from-black via-black to-[#68EDFC]"
            />
            <ColorSwatch 
                name="Electric Horizon" 
                value="linear-gradient(90deg, #00EEFF 0.48%, #0DEFFF 18.75%, #1E777E 35.58%, #000000 66.83%)" 
                className="bg-[linear-gradient(90deg,#00EEFF_0.48%,#0DEFFF_18.75%,#1E777E_35.58%,#000000_66.83%)]"
            />
        </div>
      </div>
    </section>
  );
}
