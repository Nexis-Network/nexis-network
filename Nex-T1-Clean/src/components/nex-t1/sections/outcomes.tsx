import { ContentCard } from "./content-card"

import { Zap, Shield, Search } from "lucide-react"

export function Outcomes() {
  return (
    <section className="py-24 sm:py-32 bg-[#08080a]">
      <div className="container px-6 mx-auto max-w-7xl">
        <div className="max-w-xl mb-16">
           <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white mb-6">
             Better pipeline, <br/>
             <span className="text-neutral-500">less friction.</span>
           </h2>
           <p className="text-lg text-neutral-400">
             Accelerate your evaluation process by letting the agent handle the heavy lifting.
           </p>
        </div>

        <div className="grid gap-6">
          <OutcomeCard 
            title="Faster Time-to-Value"
            description="Skip the manual setup docs. Get standard environments running in seconds, not days."
            icon={<Zap className="w-5 h-5 text-yellow-400" />}
          />
          <OutcomeCard 
            title="Risk-Free Exploration"
            description="Test edge cases and failure modes in a safe, forked mainnet environment with zero real cost."
            icon={<Shield className="w-5 h-5 text-blue-400" />}
          />
          <OutcomeCard 
            title="Deep Protocol Understanding"
            description="The agent parses source code to answer complex implementation questions instantly."
            icon={<Search className="w-5 h-5 text-violet-400" />}
          />
        </div>
      </div>
    </section>
  )
}

function OutcomeCard({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) {
  return (
    <ContentCard className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-8 group">
      <div className="p-3 rounded-full bg-neutral-900 border border-neutral-800 group-hover:border-neutral-700 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
        <p className="text-neutral-400 max-w-2xl font-light">{description}</p>
      </div>
    </ContentCard>
  )
}
