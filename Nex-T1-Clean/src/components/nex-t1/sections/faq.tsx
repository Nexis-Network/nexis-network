import { SectionHeading } from "./section-heading"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export function FAQ() {
  return (
    <section className="py-24 sm:py-32 bg-[#08080a]">
      <div className="container px-6 mx-auto max-w-4xl">
        <SectionHeading 
          title="Questions?"
          className="mb-12"
        />

        <Accordion type="single" collapsible className="w-full space-y-4">
          <AccordionItem value="item-1" className="border-neutral-800">
            <AccordionTrigger className="text-lg text-white hover:text-blue-400">Is my private key safe?</AccordionTrigger>
            <AccordionContent className="text-neutral-400 leading-relaxed text-base font-light">
              Yes. Nex-T1 never stores your private keys directly. It uses a secure, local-only signing mechanism or connects to your existing hardware wallet (Ledger, Trezor) for final approval. The agent prepares the transaction, but you sign it.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border-neutral-800">
            <AccordionTrigger className="text-lg text-white hover:text-blue-400">Which chains are supported?</AccordionTrigger>
            <AccordionContent className="text-neutral-400 leading-relaxed text-base font-light">
              We support all major EVM chains (Ethereum, Optimism, Arbitrum, Base, Polygon) and Solana. Support for new chains can be added via simple configuration.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border-neutral-800">
            <AccordionTrigger className="text-lg text-white hover:text-blue-400">Can I customize the agent&apos;s behavior?</AccordionTrigger>
            <AccordionContent className="text-neutral-400 leading-relaxed text-base font-light">
              Absolutely. You can define custom &quot;Personas&quot; and policy files that dictate what the agent is allowed to do. For example, you can set a policy that limits transactions to &lt; 1 ETH or restricts interactions to a whitelist of contracts.
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="item-4" className="border-neutral-800">
            <AccordionTrigger className="text-lg text-white hover:text-blue-400">Is this suitable for team usage?</AccordionTrigger>
            <AccordionContent className="text-neutral-400 leading-relaxed text-base font-light">
              Yes. The Enterprise plan includes multi-user seats, shared prompt libraries, and team-wide audit logs. You can also integrate it with Gnosis Safe for multi-sig workflows.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  )
}
