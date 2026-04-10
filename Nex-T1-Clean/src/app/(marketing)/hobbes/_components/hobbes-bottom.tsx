import dynamic from "next/dynamic";
import Link from "next/link";

import { HobbesFooter } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer";
import { LandingV2SplineBuy } from "@/components/landing/landing-v2-spline-buy";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

const LandingV2SplineBuyDynamic = dynamic(() => Promise.resolve(LandingV2SplineBuy));

export function HobbesBottom() {
  return (
    <>
      <section id="buy-nzt" className="bg-[#f7f6f9]">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-20">
          <LandingV2SplineBuyDynamic showTopGraphic={false} constrainedToSection backgroundColor="#f7f6f9" />
        </div>
      </section>

      <section id="cta" className="scroll-mt-28 bg-[#03040c] text-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 py-20 md:px-20 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[863px]">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#8b8b8b]/15 px-[10px] pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#95e45c]" />
              <span className="text-[13.3px] leading-[14px] text-white/90">Get Started</span>
            </div>
            <h2 className="mt-4 text-[32.1px] leading-[39.6px] tracking-[-0.36px] text-white/90">
              Ready to run Nex Copilot in your stack?
            </h2>
          </div>

          <div className="max-w-[417px]">
            <p className="text-[14px] leading-[21.6px] text-[#6a6968]">
              Acquire users faster with a copilot that explains, executes, and governs every multichain workflow.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link href="#" className="block">
                <HoverBorderGradient
                  as="div"
                  containerClassName="h-10 rounded-[41px] border-white/30 bg-white/10"
                  className="flex h-full items-center justify-center rounded-[41px] bg-white/10 px-6 py-0 text-[14.3px] font-medium text-white"
                >
                  Try Nex
                </HoverBorderGradient>
              </Link>
              <Link
                href="#"
                className="inline-flex h-10 items-center justify-center rounded-[41px] border border-white/20 bg-black/25 px-6 text-[14px] font-medium text-white"
              >
                Start Building
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HobbesFooter />
    </>
  );
}
