import { ContentCard } from "./content-card"
import { SectionHeading } from "./section-heading"

export function SocialProof() {
  return (
    <section className="py-24 sm:py-32 bg-[#08080a]">
      <div className="container px-6 mx-auto max-w-7xl">
        <SectionHeading 
          title="Trusted by engineering teams."
          className="mb-16"
        />
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuoteCard 
            quote="Nex-T1 dramatically reduced our integration time. The agent handles the tedious setup so we can focus on logic."
            author="Alex C."
            role="Senior Smart Contract Engineer"
          />
          <QuoteCard 
            quote="The ability to confirm transactions via natural language while keeping strict policy controls is a game changer for our ops."
            author="Sarah L."
            role="DeFi Operations Lead"
          />
          <QuoteCard 
            quote="Finally, an agent that understands ABI encoding and doesn't hallucinate non-existent functions. It actually works."
            author="Michael R."
            role="Protocol Architect"
          />
        </div>
      </div>
    </section>
  )
}

function QuoteCard({ quote, author, role }: { quote: string, author: string, role: string }) {
  return (
    <ContentCard className="flex flex-col justify-between h-full bg-neutral-900/10 border-neutral-800/40">
      <p className="text-lg text-neutral-300 font-light leading-relaxed mb-8">
        &quot;{quote}&quot;
      </p>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 border border-neutral-700" />
        <div>
          <div className="text-sm font-medium text-white">{author}</div>
          <div className="text-xs text-neutral-500">{role}</div>
        </div>
      </div>
    </ContentCard>
  )
}
