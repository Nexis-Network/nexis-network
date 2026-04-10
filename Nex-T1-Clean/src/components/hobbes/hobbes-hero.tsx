import type { ReactNode } from "react";

import { HobbesHeroContent } from "@/components/hobbes/hobbes-hero-content";
import { HobbesHeroCanvas } from "@/components/hobbes/hobbes-hero-canvas";
import { HobbesHeroUnicornBackground } from "@/components/hobbes/hobbes-hero-unicorn-background";

type HobbesHeroShellProps = {
  background: ReactNode;
  overlay?: ReactNode;
};

function HobbesHeroShell({ background, overlay }: HobbesHeroShellProps) {
  return (
    <section aria-labelledby="hobbes-hero-heading" className="relative isolate overflow-hidden bg-[#03040c] text-white">
      <div className="absolute inset-0 z-0">{background}</div>
      {overlay}

      <div className="relative z-10">
        <HobbesHeroContent />
      </div>
    </section>
  );
}

export function HobbesHero() {
  return (
    <HobbesHeroShell
      background={<HobbesHeroUnicornBackground />}
      overlay={
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-44 bg-gradient-to-b from-transparent via-[#03040c]/40 to-[#03040c]"
        />
      }
    />
  );
}

export function HobbesHeroBackup() {
  return (
    <HobbesHeroShell
      background={<HobbesHeroCanvas />}
      overlay={
        <>
          <div
            aria-hidden
            className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(4,6,10,0.8)_0%,rgba(4,6,10,0.42)_38%,rgba(15,15,16,0.82)_100%),linear-gradient(90deg,rgba(4,6,10,0.92)_0%,rgba(4,6,10,0.56)_44%,rgba(4,6,10,0.22)_100%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 z-[2] bg-[radial-gradient(circle_at_68%_26%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_22%_34%,rgba(149,228,92,0.06),transparent_26%)]"
          />
        </>
      }
    />
  );
}
