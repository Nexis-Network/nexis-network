"use client";

export function AboutMission() {
  return (
    <section className="w-full max-w-[1200px] px-8 py-24 flex flex-col gap-16 border-t border-white/5">
      <div className="flex flex-col gap-6 max-w-3xl">
        <div className="flex items-center gap-3">
            <div className="h-[1px] w-8 bg-sky-500/50" />
            <span className="text-sky-400 font-mono text-xs uppercase tracking-widest">Our Mission</span>
        </div>
        <h3 className="text-4xl md:text-5xl font-sans font-medium text-white tracking-tight leading-tight">
          To democratize access to advanced on-chain strategies through autonomous AI agents.
        </h3>
        <p className="text-white/60 text-lg leading-relaxed">
          The complexity of DeFi has long been a barrier to entry. We are dismantling that barrier. 
          By combining large language models with secure execution environments, Nexis empowers users 
          to deploy sophisticated trading, yield farming, and portfolio management strategies with natural language.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
        <div className="flex flex-col gap-4">
            <h4 className="text-white font-medium text-xl">Autonomous Execution</h4>
            <p className="text-white/50 leading-relaxed">
                Agents that run 24/7, monitoring market conditions and executing transactions 
                without manual intervention, ensured by the security of the Nexis Protocol.
            </p>
        </div>
        <div className="flex flex-col gap-4">
            <h4 className="text-white font-medium text-xl">Verifiable Intelligence</h4>
            <p className="text-white/50 leading-relaxed">
                Every decision made by an agent is verifiable on-chain. We believe in 
                transparency and trust-minimized architecture for the future of finance.
            </p>
        </div>
      </div>
    </section>
  );
}
