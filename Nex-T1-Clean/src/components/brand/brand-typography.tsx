"use client";



export function BrandTypography() {
  return (
    <section className="w-full max-w-[1200px] px-8 py-24 flex flex-col gap-16 border-t border-white/5">
       {/* Header */}
       <div className="flex flex-col gap-6 max-w-2xl">
        <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-sky-500/50" />
            <span className="text-sky-400 font-mono text-xs uppercase tracking-widest">Typography</span>
        </div>
        <h3 className="text-4xl font-sans font-medium text-white tracking-tight">
          Typeface
        </h3>
        <p className="text-white/60 text-lg leading-relaxed">
           Our typography is utilitarian and precise. We rely on a strong sans-serif for UI and headings, paired with monospace fonts for technical data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Inter */}
        <div className="flex flex-col gap-8">
            <div className="border-b border-white/10 pb-6 flex items-end justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-white font-bold text-2xl font-sans">Funnel Display</span>
                    <span className="text-white/40 text-sm">Primary UI & Heading Font</span>
                </div>
                <span className="text-8xl text-white/5 leading-none font-sans font-bold translate-y-3">Aa</span>
            </div>
            
            {/* Examples */}
            <div className="flex flex-col gap-6">
                <div>
                     <span className="text-xs text-white/20 font-mono mb-2 block">Display / Headings</span>
                     <p className="text-4xl text-white font-sans font-medium tracking-tight">
                        The quick brown fox.
                     </p>
                </div>
                 <div>
                     <span className="text-xs text-white/20 font-mono mb-2 block">Body / UI</span>
                     <p className="text-base text-white/70 font-sans leading-relaxed">
                        Nexis Network provides automated on-chain swaps, bridging, leverage, and lending for your favorite DeFi tokens.
                     </p>
                </div>
            </div>

            {/* Weights */}
            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                     <span className="text-2xl font-sans font-light text-white">Aa</span>
                     <span className="text-xs text-white/40 font-mono">Light 300</span>
                </div>
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                     <span className="text-2xl font-sans font-normal text-white">Aa</span>
                     <span className="text-xs text-white/40 font-mono">Regular 400</span>
                </div>
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                     <span className="text-2xl font-sans font-medium text-white">Aa</span>
                     <span className="text-xs text-white/40 font-mono">Medium 500</span>
                </div>
                 <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                     <span className="text-2xl font-sans font-bold text-white">Aa</span>
                     <span className="text-xs text-white/40 font-mono">Bold 700</span>
                </div>
            </div>
        </div>

        {/* Monospace Column */}
        <div className="flex flex-col gap-12">
            {/* Chivo Mono */}
            <div className="flex flex-col gap-8">
                <div className="border-b border-white/10 pb-6 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-white font-bold text-2xl font-chivo-mono">Chivo Mono</span>
                        <span className="text-white/40 text-sm">Technical Header Font</span>
                    </div>
                     <span className="text-8xl text-white/5 leading-none font-chivo-mono font-bold translate-y-3">Bb</span>
                </div>
                <div>
                     <p className="text-2xl text-white font-chivo-mono font-normal tracking-tight">
                        35,000 TPS
                     </p>
                     <p className="text-sm text-white/50 font-chivo-mono mt-2">
                        Used for high-impact numbers and technical headers.
                     </p>
                </div>
             </div>

            {/* Space Mono */}
            <div className="flex flex-col gap-8">
                 <div className="border-b border-white/10 pb-6 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-white font-bold text-2xl font-space-mono">Space Mono</span>
                        <span className="text-white/40 text-sm">Code & Data Font</span>
                    </div>
                     <span className="text-8xl text-white/5 leading-none font-space-mono font-bold translate-y-3">Cc</span>
                </div>
                 <div>
                     <p className="text-sm text-sky-400 font-space-mono bg-sky-400/10 p-4 rounded-lg border border-sky-400/20">
                        sudo apt-get install nexis-cli
                     </p>
                </div>
             </div>
        </div>
      </div>
    </section>
  );
}
