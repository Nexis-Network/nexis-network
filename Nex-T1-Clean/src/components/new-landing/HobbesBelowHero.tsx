import dynamic from "next/dynamic";
import Link from "next/link";

import { HobbesProblemFraming } from "@/components/landing/hobbes-problem-framing";
import { HobbesIntegrationsCarousel } from "@/app/(marketing)/hobbes/_components/hobbes-integrations-carousel";
import { HobbesMiddle } from "@/app/(marketing)/hobbes/_components/hobbes-middle";
import { HobbesFullWidthSpline } from "@/components/landing/hobbes-full-width-spline";
import { HobbesComparison } from "@/app/(marketing)/hobbes/_components/hobbes-comparison";
import { LandingV2SplineBuy } from "@/components/landing/landing-v2-spline-buy";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import {
  HOBBES_PROBLEM_HEADLINE,
  HOBBES_PROBLEM_SUPPORTING_TEXT,
} from "@/app/(marketing)/hobbes/content";

const LandingV2SplineBuyDynamic = dynamic(() => Promise.resolve(LandingV2SplineBuy));

export function HobbesBelowHero() {
  return (
    <div
      className="nl-scope relative bg-[#03040C] text-white"
      style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}
    >
      <div className="relative overflow-hidden bg-[#03040c]">
        <div className="relative z-20 pt-8 pb-6 md:pt-10">
          <HobbesIntegrationsCarousel />
        </div>
      </div>

      <HobbesProblemFraming
        headline={HOBBES_PROBLEM_HEADLINE}
        supportingText={HOBBES_PROBLEM_SUPPORTING_TEXT}
      />

      <HobbesMiddle />

      <HobbesFullWidthSpline />

      <HobbesComparison />

      <section id="buy-nzt" className="bg-[#f7f6f9]">
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-20">
          <LandingV2SplineBuyDynamic
            showTopGraphic={false}
            constrainedToSection
            backgroundColor="#f7f6f9"
          />
        </div>
      </section>

      <section id="cta" className="scroll-mt-28 bg-[#03040C] text-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 py-20 md:px-20 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[863px]">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#8b8b8b]/15 px-[10px] pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#95e45c]" />
              <span className="text-[12px] leading-[14px] tracking-[-0.01em] text-white/90">Get Started</span>
            </div>
            <h2 className="mt-4 text-[28px] leading-[34px] tracking-[-0.02em] font-medium text-white sm:text-[36px] sm:leading-[42px]">
              Ready to run Nex Copilot in your stack?
            </h2>
          </div>

          <div className="max-w-[417px]">
            <p className="text-[14px] leading-[22px] text-white/60">
              Acquire users faster with a copilot that explains, executes, and governs every
              multichain workflow.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link href="#" className="block">
                <HoverBorderGradient
                  as="div"
                  containerClassName="h-10 rounded-[41px] border-white/30 bg-white/10"
                  className="flex h-full items-center justify-center rounded-[41px] bg-white/10 px-6 py-0 text-[14px] leading-none font-medium tracking-[-0.01em] text-white"
                >
                  Try Nex Copilot
                </HoverBorderGradient>
              </Link>
              <Link
                href="#"
                className="inline-flex h-10 items-center justify-center rounded-[41px] border border-white/20 bg-black/25 px-6 text-[14px] leading-none font-medium tracking-[-0.01em] text-white"
              >
                Start Building
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
