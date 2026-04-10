"use client";

import Image from "next/image";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoItemProps = {
  name: string;
  src: string;
  dark?: boolean;
};

function LogoItem({ name, src, dark = false }: LogoItemProps) {
  return (
    <div className="flex flex-col gap-4 group">
       <div className={cn(
        "relative w-full aspect-video rounded-2xl border border-white/5 flex items-center justify-center transition-all duration-300 overflow-hidden",
        dark ? "bg-[#1C1C1C]" : "bg-white",
        "group-hover:border-white/10 group-hover:shadow-lg hover:scale-[1.01]"
      )}>
        <div className="relative w-2/3 h-1/2 transition-transform duration-500 group-hover:scale-105">
            <Image
                src={src}
                alt={name}
                fill
                className="object-contain"
                unoptimized
                sizes="(max-width: 768px) 100vw, 33vw"
                style={{ height: "auto" }}
            />
        </div>
        
        {/* Download Overlay */}
        <a 
            href={src} 
            download
            className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]"
        >
             <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Download SVG</span>
             </div>
        </a>
      </div>
      
      <div className="flex justify-between items-start px-1">
         <span className="text-white font-medium text-sm tracking-tight">{name}</span>
         <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 border border-white/10 px-1.5 py-0.5 rounded">SVG</span> 
      </div>
    </div>
  );
}

export function BrandLogos() {
  return (
    <section className="w-full max-w-[1200px] px-8 py-24 flex flex-col gap-16 border-t border-white/5">
       {/* Header */}
      <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-sky-500/50" />
            <span className="text-sky-400 font-mono text-xs uppercase tracking-widest">Assets</span>
        </div>
        <h3 className="text-4xl font-sans font-medium text-white tracking-tight">
          Logomark & Logotype
        </h3>
        <p className="text-white/60 text-lg leading-relaxed">
          The Nexis Network logo is the primary identifier of our brand. 
          Use the downloadable assets below to ensure high-quality reproduction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <LogoItem 
            name="Primary Logo (Dark Mode)" 
            src="/logo/nexis-logo-full-dark.svg"
            dark
        />
        <LogoItem 
            name="Primary Logo (Light Mode)" 
            src="/logo/nexis-logo-full-light.svg"
        />
        <LogoItem 
            name="Symbol (Dark Mode)" 
            src="/logo/nexis-logo-dark.svg"
            dark
        />
        <LogoItem 
            name="App Logo" 
            src="/logo/nexis-app-logo.svg"
            dark
        />
      </div>

      {/* Usage Guidelines Mini-Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 border-t border-white/5 pt-12">
          <div className="flex flex-col gap-4">
              <h4 className="text-white font-medium">Clearspace</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                  Always maintain clear space around the logo to ensure visibility and impact. The minimum clear space is equal to the height of the &apos;N&apos; in the logo.
              </p>
          </div>
          <div className="flex flex-col gap-4">
              <h4 className="text-white font-medium">Sizing</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                  The minimum size for the digital usage of the full logo is 100px width. For the symbol, the minimum size is 24px width.
              </p>
          </div>
          <div className="flex flex-col gap-4">
              <h4 className="text-white font-medium">Misuse</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                  Do not rotate, skew, or apply effects to the logo. Do not change the color of the logo. Always use the provided files.
              </p>
          </div>
      </div>
    </section>
  );
}
