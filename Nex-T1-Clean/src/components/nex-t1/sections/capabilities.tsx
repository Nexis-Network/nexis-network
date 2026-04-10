import { SectionHeading } from "./section-heading"
import { ContentCard } from "./content-card"
import { Terminal, Code2, LineChart, Globe } from "lucide-react"
export function Capabilities() {
  return (
    <section className="py-24 sm:py-32 bg-[#08080a]">
      <div className="container px-6 mx-auto max-w-7xl">
        <div className="mb-20">
          <SectionHeading 
            eyebrow="Capabilities"
            title="One agent. Many moments."
            description="From rapid prototyping to complex automated operations, Nex-T1 adapts to your needs."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
           <CapabilityCard 
             title="Code Interpreter"
             description="Write and execute Python/JS in a persistent sandbox. Perfect for data analysis or ad-hoc scripts."
             icon={<Code2 className="w-6 h-6 text-blue-400" />}
             codeSnippet="logger.debug('Deploying contract...')"
           />
           <CapabilityCard 
             title="On-Chain Execution"
             description="Interact with any smart contract. The agent handles ABI encoding and transaction signing."
             icon={<Terminal className="w-6 h-6 text-green-400" />}
             codeSnippet="await wallet.sendTransaction({...})"
           />
           <CapabilityCard 
             title="Market Intelligence"
             description="Real-time price data, sentiment analysis, and TVL tracking aggregated from multiple sources."
             icon={<LineChart className="w-6 h-6 text-yellow-400" />}
             codeSnippet="const price = await oracle.getPrice('ETH')"
           />
           <CapabilityCard 
             title="Cross-Chain Bridge"
             description="Seamlessly move assets between EVM chains and Solana with built-in route optimization."
             icon={<Globe className="w-6 h-6 text-violet-400" />}
             codeSnippet="await bridge.swap({ from: 'ETH', to: 'SOL' })"
           />
        </div>
      </div>
    </section>
  )
}

function CapabilityCard({ title, description, icon, codeSnippet }: { title: string, description: string, icon: React.ReactNode, codeSnippet?: string }) {
  return (
    <ContentCard className="group h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
           {icon}
        </div>
      </div>
      
      <h3 className="text-xl font-medium text-white mb-3">{title}</h3>
      <p className="text-neutral-400 leading-relaxed font-light mb-8 flex-grow">
        {description}
      </p>

      {codeSnippet && (
        <div className="mt-auto p-3 rounded-lg bg-[#050505] border border-neutral-900 font-mono text-xs text-neutral-500 overflow-hidden truncate">
          <span className="text-neutral-600 mr-2">$</span>
          {codeSnippet}
        </div>
      )}
    </ContentCard>
  )
}
