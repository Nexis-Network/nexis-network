import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_DASHBOARD_PATH, buildAuthSignInUrl } from "@/lib/constants";

const launchCommandHref = buildAuthSignInUrl({ redirectTo: APP_DASHBOARD_PATH });

export function PricingHero() {
  return (
    <section className="relative overflow-hidden ">
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-28 md:pb-24 md:pt-40 lg:pb-28">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
            Pricing
          </span>
          <h1 className="text-balance text-4xl font-regular leading-tight text-white sm:text-5xl md:text-6xl">
            Simple pricing for autonomous finance teams
          </h1>
          <p className="text-balance max-w-2xl text-sm text-white/70 sm:text-base md:text-lg">
            Nex-T1 eliminates manual exchange ops, fragmented custody workflows, and compliance blind spots. Pick the
            automation tier that matches your risk posture, then scale to millions in AUM without adding headcount.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="min-w-[160px]">
              <Link href={launchCommandHref}>Launch Command Center</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 text-white hover:bg-white/10">
              <Link href="mailto:hello@nexis.network">Talk to Nexis</Link>
            </Button>
          </div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            SOC 2 in-progress · RLS enforced · LangGraph + LangSmith observability
          </p>
        </div>
      </div>
    </section>
  );
}
