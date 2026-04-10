import { HobbesHero } from "@/components/hobbes/hobbes-hero";
import { HobbesProblemFraming } from "@/components/landing/hobbes-problem-framing";
import { HobbesIntegrationsCarousel } from "@/app/(marketing)/hobbes/_components/hobbes-integrations-carousel";

import { HOBBES_PROBLEM_HEADLINE, HOBBES_PROBLEM_SUPPORTING_TEXT } from "@/app/(marketing)/hobbes/content";

export function HobbesTop() {
  return (
    <>
      <div className="relative overflow-hidden bg-[#03040c]">
        <HobbesHero />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-b from-transparent via-[#03040c]/42 to-[#03040c]"
        />
        <div className="relative z-20 -mt-2 pt-8 pb-6 md:-mt-4 md:pt-10">
          <HobbesIntegrationsCarousel />
        </div>
      </div>

      <HobbesProblemFraming headline={HOBBES_PROBLEM_HEADLINE} supportingText={HOBBES_PROBLEM_SUPPORTING_TEXT} />
    </>
  );
}
