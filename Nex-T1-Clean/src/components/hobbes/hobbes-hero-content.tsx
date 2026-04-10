import Link from "next/link";

import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";

const HOBBES_LOGIN_HREF = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

export function HobbesHeroContent() {
  return (
    <div className="mx-auto flex min-h-[42rem] w-full max-w-[1440px] items-end px-6 pb-16 pt-28 sm:min-h-[46rem] sm:px-8 sm:pb-20 sm:pt-36 lg:min-h-[48rem] lg:px-20 lg:pb-24 lg:pt-44">
      <div className="max-w-[40rem]">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-white/72">
          <span className="h-2 w-2 rounded-full bg-[#95e45c]" />
          Hobbes
        </p>

        <h1
          id="hobbes-hero-heading"
          className="mt-6 max-w-[12ch] text-balance text-[2.875rem] font-normal leading-[0.92] tracking-[-0.06em] text-white sm:text-[4rem] lg:text-[4.75rem]"
        >
          Run autonomous DeFi workflows, 24/7
        </h1>

        <p className="mt-5 max-w-[34rem] text-pretty text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
          Nex Copilot unifies secure execution, multichain integrations, and AI memory so teams move faster with
          control.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href={HOBBES_LOGIN_HREF} className="block w-full sm:w-auto">
            <HoverBorderGradient
              as="div"
              containerClassName="h-11 w-full rounded-full border-white/25 bg-white/8 sm:w-auto"
              className="flex h-full items-center justify-center rounded-full bg-white/10 px-6 py-0 text-sm font-medium text-white"
            >
              Get Access
            </HoverBorderGradient>
          </Link>

          <Link
            href="#features"
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-black/30 px-6 text-sm font-medium text-white/88 transition-colors hover:bg-white/8"
          >
            Explore Features
          </Link>
        </div>
      </div>
    </div>
  );
}
