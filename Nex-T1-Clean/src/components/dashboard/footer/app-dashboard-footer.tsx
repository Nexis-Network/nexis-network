"use client";

import {
  AppleAppStoreIcon,
  DiscordIcon,
  GooglePlayIcon,
  YoutubeIcon,
} from "@/components/app/app-screen-icons";
import { CountrySelector } from "@/components/country-dialog/CountrySelector";
import { useTranslations } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { getDashboardFooterCopy } from "@/modules/app/i18n";

import { FooterDivider } from "./footer-divider";
import { FooterChatPreferencesCenter } from "./footer-chat-preferences-center";
import { FooterLegalLinks } from "./footer-legal-links";
import { FooterGasIcon } from "./footer-metric-icons";
import { FooterThemeToggle } from "./footer-theme-toggle";

export function AppDashboardFooter({
  formattedGas,
}: {
  formattedEth?: string;
  formattedGas: string;
}) {
  const t = useTranslations("app");
  const copy = getDashboardFooterCopy(t);
  const linkClassName =
    "pt-[2px] text-[11px] leading-[11px] text-[var(--auth-footer-meta)] transition-colors hover:text-[var(--auth-footer-meta)]";
  const socialIconClassName = "size-4";
  const socialIconStyle = { filter: "brightness(0.6632653061)" } as const;
  const footerControlClassName =
    "h-[24px] w-[42px] rounded-full border-[var(--auth-footer-control-border,var(--auth-footer-divider))] bg-[var(--auth-footer-control-bg)] px-1.5 py-1 text-[11px] leading-[11px] text-[var(--auth-footer-control-fg,var(--auth-footer-meta))] shadow-none hover:bg-[var(--auth-footer-control-hover-bg,var(--auth-footer-control-bg))] hover:text-[var(--auth-footer-control-fg,var(--auth-footer-meta))] focus-visible:border-[var(--auth-border-strong)] focus-visible:ring-1 focus-visible:ring-[var(--auth-focus)]";
  const footerControlCompactClassName =
    "h-[22px] w-[38px] rounded-full border-[var(--auth-footer-control-border,var(--auth-footer-divider))] bg-[var(--auth-footer-control-bg)] px-1 py-1 text-[10px] leading-[10px] text-[var(--auth-footer-control-fg,var(--auth-footer-meta))] shadow-none hover:bg-[var(--auth-footer-control-hover-bg,var(--auth-footer-control-bg))] hover:text-[var(--auth-footer-control-fg,var(--auth-footer-meta))] focus-visible:border-[var(--auth-border-strong)] focus-visible:ring-1 focus-visible:ring-[var(--auth-focus)]";

  return (
    <footer className="flex h-[34px] w-full items-center justify-center bg-transparent px-[10px]">
      <div className="relative flex w-full items-center justify-between gap-4">
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3891FF] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#3891FF]" />
            </span>
            <span className="pt-[2px] text-[11px] leading-[11px] text-[var(--auth-footer-meta)]">
              {copy.live}
            </span>
          </div>

          <FooterDivider />

          <div className="flex items-center gap-4">
            <FooterLegalLinks linkClassName={linkClassName} />
          </div>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-3">
            <span
              className={cn("cursor-not-allowed transition-opacity")}
              aria-label={copy.store.appleComingSoon}
              title={copy.store.comingSoonTitle}
            >
              <AppleAppStoreIcon
                className={socialIconClassName}
                alt=""
                style={socialIconStyle}
                tone="light"
              />
            </span>
            <span
              className={cn("cursor-not-allowed transition-opacity")}
              aria-label={copy.store.googleComingSoon}
              title={copy.store.comingSoonTitle}
            >
              <GooglePlayIcon
                className={socialIconClassName}
                alt=""
                style={socialIconStyle}
                tone="light"
              />
            </span>
            <a
              href="https://discord.gg/VrmqAbpX"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity"
              aria-label={copy.social.discord}
            >
              <DiscordIcon
                className={socialIconClassName}
                alt=""
                style={socialIconStyle}
                tone="light"
              />
            </a>
            <a
              href="https://www.youtube.com/@Nexis_Labs"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity"
              aria-label={copy.social.youtube}
            >
              <YoutubeIcon
                className={socialIconClassName}
                alt=""
                style={socialIconStyle}
                tone="light"
              />
            </a>
          </div>

          <FooterDivider />
          <FooterThemeToggle
            className={footerControlClassName}
            iconClassName="text-[var(--auth-footer-meta)]"
          />
          <FooterDivider />
          <CountrySelector
            aria-label={copy.selectRegion}
            className={footerControlClassName}
            flagSize={16}
            showLabel={false}
          />
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden -translate-x-1/2 items-center md:flex">
          <FooterChatPreferencesCenter />
        </div>

        <div className="flex w-full items-center justify-between md:hidden">
          <div className="flex min-w-0 items-center gap-3 overflow-x-auto no-scrollbar">
            <FooterLegalLinks linkClassName="whitespace-nowrap pt-[2px] text-[10px] leading-[11px] text-[var(--auth-footer-meta)]" />
          </div>

          <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
            <FooterChatPreferencesCenter />
          </div>

          <div className="ml-3 flex items-center gap-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <FooterGasIcon className="size-3" />
              <span className="pt-[2px] font-mono text-[10px] leading-[10px] text-[var(--auth-footer-meta)]">
                {formattedGas}
              </span>
            </div>
            <FooterDivider className="h-3" />
            <FooterThemeToggle
              className={footerControlCompactClassName}
              iconClassName="size-3 text-[var(--auth-footer-meta)]"
            />
            <CountrySelector
              aria-label={copy.selectRegion}
              className={footerControlCompactClassName}
              flagSize={14}
              showLabel={false}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
