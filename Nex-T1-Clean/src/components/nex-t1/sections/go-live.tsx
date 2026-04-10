import { Play } from "lucide-react"

export function GoLive() {
  return (
    <section className="py-32 bg-[#08080a] border-y border-white/5">
      <div className="container px-6 mx-auto max-w-7xl">
        <div className="max-w-xl mb-24">
           <h2 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">Getting Nex-T1 Live</h2>
           <p className="text-lg text-neutral-500 mt-6">
             Deploying Nex-T1 takes minutes, not weeks. Start with a pre-built template or build from scratch.
           </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          <Step 
            number="01" 
            title="Connect Workspace" 
            description="Link your protocol's GitHub repository and connect your primary RPC nodes." 
          />
          <Step 
            number="02" 
            title="Define Guardrails" 
            description="Set strict policies for what the agent can and cannot execute on-chain." 
          />
          <Step 
            number="03" 
            title="Deploy Widget" 
            description="Embed the Hobbes agent directly on your site with a single line of code." 
          />
        </div>
        
        <div className="mt-20 pt-20 border-t border-white/5 flex flex-col md:flex-row items-center gap-12 justify-between">
           <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                 <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Watch Implementation Guide</div>
                <div className="text-xs text-neutral-500 mt-0.5">Learn how to customize Nex-T1 for your protocol</div>
              </div>
           </div>
           
           <button className="px-8 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors">
              Request Demo Implementation
           </button>
        </div>
      </div>
    </section>
  )
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="space-y-6">
      <div className="text-xs font-mono text-neutral-600 tracking-widest">{number}</div>
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">{description}</p>
      </div>
    </div>
  )
}
