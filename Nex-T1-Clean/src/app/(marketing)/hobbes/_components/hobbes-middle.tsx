import Image from "next/image";

import { HobbesFeatureRotator } from "@/components/landing/hobbes-feature-rotator";
import { HobbesFeatureUnicornScene } from "@/components/hobbes/hobbes-feature-unicorn-scene";

import {
  ENTERPRISE_ITEMS,
  HOBBES_FEATURE_STEPS,
  HOW_IT_WORKS_ASSET,
  OUTCOME_ASSETS,
  TESTIMONIAL_AVATAR_1,
  TESTIMONIAL_AVATAR_2,
  USE_CASES,
} from "@/app/(marketing)/hobbes/content";

export function HobbesMiddle() {
  return (
    <>
      <section id="features" className="scroll-mt-28 mx-auto w-full max-w-[1440px] px-6 py-20 md:px-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[863px]">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#8b8b8b]/10 px-[10px] pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#95e45c]" />
              <span className="text-[12.7px] leading-[14px] text-white/90">The Nex Copilot Stack</span>
            </div>
            <h2 className="mt-4 text-balance text-[28px] leading-[34px] tracking-[-0.36px] text-white sm:text-[32px] sm:leading-[39.6px]">
              How Nex Copilot automates multichain operations, 24/7
            </h2>
          </div>
          <p className="max-w-[417px] text-[14px] leading-[22px] text-white/54">
            Nex Copilot blends HITL governance, persistent runtime state, and live integrations so every action stays
            secure.
          </p>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-[16px] lg:grid-cols-[476px_1fr]">
          <HobbesFeatureRotator items={HOBBES_FEATURE_STEPS} />
          <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-[16px] sm:min-h-[420px] lg:min-h-[520px]">
            <HobbesFeatureUnicornScene />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-6 py-20 md:px-20">
        <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#8b8b8b]/10 px-[10px] pr-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[#95e45c]" />
          <span className="text-[12.7px] leading-[14px] text-white/90">Testimonials</span>
        </div>
        <h2 className="mt-4 max-w-[520px] text-balance text-[28px] leading-[34px] tracking-[-0.36px] text-white sm:text-[32px] sm:leading-[39.6px]">
          What Fast-Growing Teams Say About Nex Copilot
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-[16px] border border-white/10 bg-[#141413] p-6">
            <p className="text-[64px] leading-[44px] text-white/70 sm:text-[96px] sm:leading-[64px]">“</p>
            <p className="-mt-2 text-[20px] leading-[28px] tracking-[-0.6px] text-white sm:-mt-4 sm:text-[24px] sm:leading-[34px] sm:tracking-[-0.7px] lg:text-[32px] lg:leading-[43.5px] lg:tracking-[-0.8px]">
              Nex Copilot is the first copilot we&apos;ve used that automates multichain workflows while still enforcing
              human approvals where it matters.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Image
                src={TESTIMONIAL_AVATAR_1}
                alt="Conor Brennan-Burke"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full"
              />
              <div>
                <p className="text-[14px] leading-4 text-white">Conor Brennan-Burke</p>
                <p className="mt-2 text-[14px] leading-4 text-white/54">Founder &amp; CEO, Hyperspell</p>
              </div>
            </div>
          </article>

          <article className="rounded-[16px] border border-white/10 bg-[#141413] p-6">
            <p className="text-[64px] leading-[44px] text-white/70 sm:text-[96px] sm:leading-[64px]">“</p>
            <p className="-mt-2 text-[20px] leading-[28px] tracking-[-0.6px] text-white sm:-mt-4 sm:text-[24px] sm:leading-[34px] sm:tracking-[-0.7px] lg:text-[32px] lg:leading-[43.5px] lg:tracking-[-0.8px]">
              From market intel to wallet execution, Nex Copilot compresses our stack into one secure interface and
              speeds up our daily operations.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Image src={TESTIMONIAL_AVATAR_2} alt="Han Gu" width={44} height={44} className="h-11 w-11 rounded-full" />
              <div>
                <p className="text-[14px] leading-4 text-white">Han Gu</p>
                <p className="mt-2 text-[14px] leading-4 text-white/54">Co-Founder &amp; CTO, Palate Insights</p>
              </div>
            </div>
          </article>

          <article className="rounded-[16px] border border-white/10 bg-[#141413] p-6">
            <p className="text-[64px] leading-[44px] text-white/70 sm:text-[96px] sm:leading-[64px]">“</p>
            <p className="-mt-2 text-[20px] leading-[28px] tracking-[-0.6px] text-white sm:-mt-4 sm:text-[24px] sm:leading-[34px] sm:tracking-[-0.7px] lg:text-[32px] lg:leading-[43.5px] lg:tracking-[-0.8px]">
              Nex Copilot keeps context across sessions, so the agent improves outcomes instead of resetting every chat.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-[14px]">AL</div>
              <div>
                <p className="text-[14px] leading-4 text-white">Avery Lang</p>
                <p className="mt-2 text-[14px] leading-4 text-white/54">VP Growth, Canary</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="outcomes" className="scroll-mt-28 mx-auto w-full max-w-[1440px] px-6 py-20 md:px-20">
        <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#8b8b8b]/10 px-[10px] pr-3">
          <span className="h-1.5 w-1.5 rounded-full bg-[#95e45c]" />
          <span className="text-[12.7px] leading-[14px] text-white/90">Outcomes</span>
        </div>
        <h2 className="mt-4 max-w-[700px] text-balance text-[28px] leading-[34px] tracking-[-0.36px] text-white sm:text-[32px] sm:leading-[39.6px]">
          Faster execution. Stronger control across chains.
        </h2>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <article className="overflow-hidden rounded-[16px] border border-white/10 bg-[#141413]">
            <div className="relative h-[220px] w-full">
              <Image
                src={OUTCOME_ASSETS[0]}
                alt="Polymarket agentic trading interface"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-6">
              <h3 className="text-[20px] leading-6 text-white">Safer Transactions</h3>
              <p className="mt-2 text-[14px] leading-6 text-white/54">
                Agentic Polymarket trading runs 24/7 with approval guardrails plus risk controls.
              </p>
            </div>
          </article>
          <article className="overflow-hidden rounded-[16px] border border-white/10 bg-[#141413]">
            <div className="relative h-[220px] w-full">
              <Image
                src={OUTCOME_ASSETS[1]}
                alt="Unified integrations for web3 trading operations"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-6">
              <h3 className="text-[20px] leading-6 text-white">Unified Integrations</h3>
              <p className="mt-2 text-[14px] leading-6 text-white/54">
                Access market, onchain, and governance tooling from one MCP-ready copilot.
              </p>
            </div>
          </article>
          <article className="overflow-hidden rounded-[16px] border border-white/10 bg-[#141413]">
            <div className="relative h-[220px] w-full">
              <Image
                src={OUTCOME_ASSETS[2]}
                alt="Multichain execution coverage across supported networks"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-6">
              <h3 className="text-[20px] leading-6 text-white">Chain Coverage</h3>
              <p className="mt-2 text-[14px] leading-6 text-white/54">
                Operate across Ethereum, Base, Arbitrum, Optimism, Polygon, and Solana.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-28 bg-[#f7f6f9] text-[#212121]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:px-20">
          <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#bcbcbc]/15 px-[10px] pr-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#95e45c]" />
            <span className="text-[12.7px] leading-[14px] text-[#212121]/90">How It Works</span>
          </div>
          <h2 className="mt-4 max-w-[700px] text-balance text-[28px] leading-[34px] tracking-[-0.36px] sm:text-[32px] sm:leading-[39.6px]">
            Getting Nex Copilot Live Takes Days, Not Months
          </h2>
          <p className="mt-4 max-w-[820px] text-[14px] leading-6 text-[#6a6968]">
            Connect wallets, approval policies, and MCP endpoints. Nex Copilot ships with secure defaults for
            multichain execution, integrations, and persistent context.
          </p>

          <div className="mt-12 overflow-hidden rounded-[16px] border border-[#1f1f1f]/10 bg-white">
            <Image
              src={HOW_IT_WORKS_ASSET}
              alt="How Nex Copilot goes live"
              width={1200}
              height={600}
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </div>
      </section>

      <section id="use-cases" className="scroll-mt-28 bg-[#f7f6f9] text-[#212121]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-6 py-20 md:px-20">
          <div className="max-w-[1280px]">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#bcbcbc]/15 px-[10px] pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b66ae9]" />
              <span className="text-[12.7px] leading-[14px] text-[#212121]/90">Use Cases</span>
            </div>
            <h2 className="mt-4 text-balance text-[28px] leading-[34px] tracking-[-0.36px] sm:text-[32px] sm:leading-[39.6px]">
              One copilot. Every DeFi team function.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {USE_CASES.map((item) => (
              <article key={item.label} className="relative rounded-[12px] border border-white/5 bg-white p-6">
                <div className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#f1eff4] bg-[#f7f6f9] p-2">
                  <div className="relative h-3 w-3 shrink-0">
                    <Image src={item.icon} alt="" fill className="object-contain" sizes="12px" />
                  </div>
                  <span className="text-[12.6px] leading-[14px] tracking-[-0.14px]">{item.label}</span>
                </div>
                <h3 className="mt-10 text-[18px] leading-5 tracking-[-0.2px] sm:mt-16">{item.title}</h3>
                <p className="mt-2 text-[14.1px] leading-6 tracking-[-0.16px] text-[#6a6968]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f6f9] text-[#212121]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-14 px-6 pt-10 pb-16 md:px-20">
          <div>
            <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#bcbcbc]/15 px-[10px] pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#68ace8]" />
              <span className="text-[12.5px] leading-[14px] text-[#212121]/90">Enterprise</span>
            </div>
            <h2 className="mt-4 text-balance text-[28px] leading-[34px] tracking-[-0.36px] sm:text-[32px] sm:leading-[39.6px]">
              Nex Copilot is Production Ready
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {ENTERPRISE_ITEMS.map((item, index) => (
              <article
                key={item.title}
                className={`pb-1 pr-8 ${index < ENTERPRISE_ITEMS.length - 1 ? "xl:border-r xl:border-[#1f1f1f]/10" : ""}`}
              >
                <div className="flex min-h-11 flex-nowrap items-center overflow-hidden whitespace-nowrap pr-1">
                  {item.logos.map((logo) => (
                    <div
                      key={`${item.title}-${logo.alt}`}
                      className="-ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1f1f1f]/10 bg-white p-1 first:ml-0"
                    >
                      <Image
                        src={logo.src}
                        alt={logo.alt}
                        title={logo.alt}
                        width={32}
                        height={32}
                        className="h-full w-full object-contain rounded-full"
                      />
                    </div>
                  ))}
                </div>
                <h3 className="mt-6 text-[14.4px] leading-4 tracking-[-0.16px]">{item.title}</h3>
                <p className="mt-2 text-[14.1px] leading-6 tracking-[-0.16px] text-[#6a6968]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
