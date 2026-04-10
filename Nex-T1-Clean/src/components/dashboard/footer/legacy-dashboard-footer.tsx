"use client";

import Image from "next/image";
import { Github } from "lucide-react";
import { CountrySelector } from "@/components/country-dialog/CountrySelector";
import { useTranslations } from "@/components/providers/locale-provider";
import { getDashboardFooterCopy } from "@/modules/app/i18n";

import { FooterLegalLinks } from "./footer-legal-links";

export function LegacyDashboardFooter({ formattedEth, formattedGas }: { formattedEth: string; formattedGas: string }) {
  const t = useTranslations("app");
  const copy = getDashboardFooterCopy(t);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 hidden h-auto items-center justify-center border-t border-border bg-surface/50 px-3 py-2 backdrop-blur-md md:flex sm:h-7 sm:px-6 sm:py-0">
      <div className="flex w-full max-w-[1968px] flex-col items-center justify-between gap-2 sm:flex-row sm:gap-0">
        <div className="flex w-full items-center justify-between sm:hidden">
          <div className="flex items-center gap-3">
            <FooterLegalLinks linkClassName="whitespace-nowrap pt-0.5 text-[10px] leading-none text-[#ACADAE] transition-colors hover:text-white" />
          </div>
          <div className="flex min-w-[60px] items-center justify-end gap-2">
            <div className="flex items-center gap-1.5">
              <Image src="/assets/footer/gas.svg" alt={copy.metrics.gas} width={12} height={12} className="opacity-60" />
              <span className="whitespace-nowrap pt-0.5 font-mono text-[10px] leading-none text-[#ACADAE]">{formattedGas}</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <CountrySelector
              aria-label={copy.selectRegion}
              className="h-[22px] w-[38px] rounded-full border-white/10 bg-white/[0.03] px-1 py-1 text-[10px] leading-[10px] text-[#ACADAE] shadow-none hover:bg-white/[0.06] focus-visible:border-white/15 focus-visible:ring-1 focus-visible:ring-white/20"
              flagSize={14}
              showLabel={false}
            />
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#47BB64] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#47BB64]" />
            </span>
            <span className="pt-0.5 text-[11px] leading-none text-white">{copy.live}</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-4">
            <FooterLegalLinks linkClassName="pt-0.5 text-[11px] leading-none text-[#ACADAE] transition-colors hover:text-white" />
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-3">
            <a href="https://discord.gg/nexis-network" target="_blank" rel="noopener noreferrer" className="opacity-60 transition-opacity hover:opacity-100" aria-label={copy.social.discord}>
              <Image src="/icons/social-icons/discord.svg" alt={copy.social.discord} width={16} height={16} />
            </a>
            <a href="https://x.com/nexis_network" target="_blank" rel="noopener noreferrer" className="opacity-60 transition-opacity hover:opacity-100" aria-label={copy.social.twitter}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-white">
                <path d="M9.333 6.928L14.544 1H13.308L8.784 6.146L5.17 1H1L6.463 8.78L1.046 14.996H2.282L7.01 9.563L10.83 14.996H15L9.333 6.928ZM7.64 8.854L7.086 8.08L2.68 1.867H4.578L8.134 6.88L8.688 7.654L13.31 14.17H11.412L7.64 8.854Z" />
              </svg>
            </a>
            <a href="https://github.com/nexis-ai" target="_blank" rel="noopener noreferrer" className="opacity-60 transition-opacity hover:opacity-100" aria-label={copy.social.github}>
              <Github className="size-4 text-white" />
            </a>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex min-w-[70px] items-center gap-1.5">
            <Image src="/assets/footer/eth.svg" alt={copy.metrics.eth} width={12} height={12} />
            <span className="pt-0.5 font-mono text-xs leading-none text-[#ACADAE]">{formattedEth}</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex min-w-[70px] items-center gap-1.5">
            <Image src="/assets/footer/gas.svg" alt={copy.metrics.gas} width={14} height={14} className="opacity-60" />
            <span className="pt-0.5 font-mono text-xs leading-none text-[#ACADAE]">{formattedGas}</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <CountrySelector
            aria-label={copy.selectRegion}
            className="h-[24px] w-[42px] rounded-full border-white/10 bg-white/[0.03] px-1.5 py-1 text-[11px] leading-[11px] text-[#ACADAE] shadow-none hover:bg-white/[0.06] focus-visible:border-white/15 focus-visible:ring-1 focus-visible:ring-white/20"
            flagSize={16}
            showLabel={false}
          />
        </div>
      </div>
    </footer>
  );
}
