import Image from "next/image";

import {
  COMPARISON_COMPETITOR_ONE,
  COMPARISON_COMPETITOR_TWO,
  COMPARISON_HEADER_BG,
  COMPARISON_NEXIS_ICON,
  COMPARISON_NOISE,
  COMPARISON_ROWS,
  type ComparisonStatus,
} from "@/app/(marketing)/hobbes/content";

function ComparisonStatusCell({ status }: { status: ComparisonStatus }) {
  if (status === "check") {
    return (
      <span
        aria-label="Supported"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#92dbac] bg-[#e6f7ee]"
      >
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-[#228b4e]" fill="none" aria-hidden="true">
          <path
            d="M4.8 10.2L8.35 13.6L15.2 6.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (status === "warn") {
    return (
      <span
        aria-label="Partial Support"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#f1d28b] bg-[#fff6df] text-[12px] leading-none text-[#b37921]"
      >
        !
      </span>
    );
  }

  return <span className="text-sm text-[#212121]/70">-</span>;
}

export function HobbesComparison() {
  return (
    <section className="bg-[#f7f6f9] text-[#212121]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-14 px-6 pt-24 pb-20 md:px-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[863px]">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-white/20 bg-[#bcbcbc]/15 px-[10px] pr-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#95e45c]" />
              <span className="text-[12.7px] leading-[14px] text-[#212121]/90">Comparison</span>
            </div>
            <h2 className="mt-4 text-balance text-[28px] leading-[34px] tracking-[-0.36px] sm:text-[32.2px] sm:leading-[39.6px]">
              Built for Real DeFi Execution
            </h2>
          </div>
          <p className="max-w-[417px] text-[13.9px] leading-6 tracking-[-0.16px] text-[#212121]/54">
            Nex Copilot is not a static bot or one-way demo. It reasons over context, uses live integrations, and
            executes with governance.
          </p>
        </div>

        <div className="space-y-3 sm:hidden">
          {COMPARISON_ROWS.map((row) => (
            <article key={row.feature} className="rounded-[16px] border border-[#1f1f1f]/10 bg-white p-4">
              <p className="text-[13px] leading-5 text-[#212121]">{row.feature}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[12px] leading-4 text-[#212121]/70">
                <div className="flex items-center justify-between rounded-[12px] bg-[#f7f6f9] px-3 py-2">
                  <span>Nex Copilot</span>
                  <ComparisonStatusCell status={row.hobbes} />
                </div>
                <div className="flex items-center justify-between rounded-[12px] bg-[#f7f6f9] px-3 py-2">
                  <span>{COMPARISON_COMPETITOR_ONE}</span>
                  <ComparisonStatusCell status={row.competitorOne} />
                </div>
                <div className="flex items-center justify-between rounded-[12px] bg-[#f7f6f9] px-3 py-2">
                  <span>{COMPARISON_COMPETITOR_TWO}</span>
                  <ComparisonStatusCell status={row.competitorTwo} />
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="relative hidden overflow-hidden rounded-[16px] border border-[#1f1f1f]/10 sm:block">
          <div className="grid h-14 grid-cols-[250px_1fr_1fr_1fr] border-b border-[#1f1f1f]/10">
            <div className="flex items-center px-6 text-[12.3px] leading-[14px] text-[#212121]/54">Key Features</div>

            <div className="relative flex items-center justify-center border-l border-[#1f1f1f]/10">
              <Image
                src={COMPARISON_HEADER_BG}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 0px, (max-width: 1024px) 33vw, 25vw"
              />
              <Image
                src={COMPARISON_NOISE}
                alt=""
                fill
                className="opacity-10 mix-blend-soft-light"
                sizes="(max-width: 640px) 0px, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="relative flex items-center gap-1.5 text-white">
                <Image src={COMPARISON_NEXIS_ICON} alt="Nexis" width={20} height={20} className="h-5 w-5" />
                <span className="text-[20px] leading-5 tracking-[-1px]">Nex Copilot</span>
              </div>
            </div>

            <div className="flex items-center justify-center border-l border-[#1f1f1f]/10 px-2 text-center text-[13.1px] leading-4">
              {COMPARISON_COMPETITOR_ONE}
            </div>
            <div className="flex items-center justify-center border-l border-[#1f1f1f]/10 px-2 text-center text-[13.1px] leading-4">
              {COMPARISON_COMPETITOR_TWO}
            </div>
          </div>

          {COMPARISON_ROWS.map((row) => (
            <div
              key={row.feature}
              className="grid h-14 grid-cols-[250px_1fr_1fr_1fr] border-b border-[#1f1f1f]/10 last:border-b-0"
            >
              <div className="flex items-center px-6 text-[12.4px] leading-[17.5px] text-[#212121]">{row.feature}</div>
              <div className="flex items-center justify-center border-l border-[#1f1f1f]/10">
                <ComparisonStatusCell status={row.hobbes} />
              </div>
              <div className="flex items-center justify-center border-l border-[#1f1f1f]/10">
                <ComparisonStatusCell status={row.competitorOne} />
              </div>
              <div className="flex items-center justify-center border-l border-[#1f1f1f]/10">
                <ComparisonStatusCell status={row.competitorTwo} />
              </div>
            </div>
          ))}

          <div className="pointer-events-none absolute bottom-[-31px] left-[250px] h-[367px] w-[343px] bg-gradient-to-b from-[#9ddab9] to-transparent opacity-10" />
        </div>
      </div>
    </section>
  );
}
