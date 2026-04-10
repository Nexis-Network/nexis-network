import { SectionHeading } from "./section-heading"
import { Check, Minus } from "lucide-react"

export function Comparison() {
  return (
    <section className="py-24 sm:py-32 bg-[#08080a]">
      <div className="container px-6 mx-auto max-w-5xl">
        <SectionHeading 
          title="Built for production."
          align="center"
          className="mb-16"
        />

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-neutral-800 pb-6 text-sm font-medium text-neutral-500 uppercase tracking-widest pl-4">
              <div>Feature</div>
              <div className="text-center">Nex-T1</div>
              <div className="text-center">Others</div>
            </div>
            
            <div className="space-y-4 pt-6">
               <Row feature="E2B Sandbox Runtime" nexT1={true} other={true} />
               <Row feature="Strict Policy Engine" nexT1={true} other={false} />
               <Row feature="Hardware Wallet Support" nexT1={true} other={false} />
               <Row feature="On-Chain Analytics" nexT1={true} other={false} />
               <Row feature="Human-in-the-loop Guardrails" nexT1={true} other={true} />
               <Row feature="Open Source Audit" nexT1={true} other={false} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({ feature, nexT1, other }: { feature: string, nexT1: boolean, other: boolean }) {
  return (
    <div className="grid grid-cols-3 text-base items-center py-4 border-b border-neutral-800/30 last:border-0 pl-4">
      <div className="font-medium text-white">{feature}</div>
      <div className="flex items-center justify-center">
        {nexT1 ? <Check className="w-5 h-5 text-blue-500" /> : <Minus className="w-5 h-5 text-neutral-800" />}
      </div>
      <div className="flex items-center justify-center">
        {other ? <Check className="w-5 h-5 text-neutral-600" /> : <Minus className="w-5 h-5 text-neutral-800" />}
      </div>
    </div>
  )
}
