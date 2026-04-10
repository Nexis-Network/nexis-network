"use client";

import Image from "next/image";
import Link from "next/link";
import { type ComponentType, type SVGProps } from "react";
import { TwitterIcon } from "@/components/icons/twitter-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { useTranslations } from "@/components/providers/locale-provider";
import { translateMarketingLabel } from "@/i18n/label-maps";

const footerLinkGroups = [
  {
    group: "Apps",
    items: [
      { title: "Nex-T1", href: "/nex-t1" },
      { title: "Nex Console", href: "/nex-console" },
      { title: "Nex Cloud", href: "/nex-cloud" },
      { title: "Agent Marketplace", href: "/marketplace" },
      { title: "AI Arena", href: "/ai-leaderboard" },
      { title: "Agent Builder", href: "/agents/new" },
      { title: "Agent Launchpad", href: "/launchpad" },

    ],
  },
  {
    group: "Protocol",
    items: [
      { title: "Nex Runtime", href: "/nex-runtime" },
      { title: "Nex Verify", href: "/nex-verify" },
      { title: "Nex Grid", href: "/nex-grid" },
      { title: "Nex MCP", href: "/nex-mcp" },
      { title: "Nexis AI Chain", href: "https://github.com/Nexis-AI/Nexis-appchain" },
      { title: "Ecosystem", href: "/ecosystem" },
      { title: "Token (NZT)", href: "/nzt" },
      { title: "Pricing", href: "/pricing" },
    ],
  },
  {
    group: "Developers",
    items: [
      { title: "Documentation", href: "https://docs.nex-t1.ai" },
      { title: "API Reference", href: "https://registry.scalar.com/@nex-t1/apis/nex-t1-defai/" },
      { title: "Tutorials", href: "https://docs.nex-t1.ai/tutorials/deploy-contract" },
      { title: "Nex-T1 API", href: "https://docs.nex-t1.ai/Nex-T1/overview" },
      { title: "Hackathon", href: "https://docs.nex-t1.ai/hackathon/introduction" },
      { title: "Bug Bounty", href: "https://docs.nex-t1.ai/bug-bounty/overview" },
    ],
  },
  {
    group: "Resources",
    items: [
      { title: "Blog", href: "/blog" },
      { title: "About", href: "/about" },
      { title: "Brand Guidelines", href: "/brand-guidelines" },
      { title: "Careers", href: "/careers" },
      { title: "Contact", href: "mailto:hello@nex-t1.ai" },
    ],
  },
];

type SocialIcon = ComponentType<SVGProps<SVGSVGElement>>;

const GithubIcon: SocialIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#github_clip0)">
      <mask id="github_mask0" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="22" height="22">
        <path d="M0 0H22V22H0V0Z" fill="white" />
      </mask>
      <g mask="url(#github_mask0)">
        <path fillRule="evenodd" clipRule="evenodd" d="M11 0.280029C4.95 0.280029 0 5.23003 0 11.28C0 16.092 3.163 20.217 7.563 21.73C8.113 21.867 8.25 21.454 8.25 21.18V19.254C5.225 19.942 4.537 17.879 4.537 17.879C3.987 16.642 3.3 16.229 3.3 16.229C2.338 15.542 3.438 15.542 3.438 15.542C4.538 15.679 5.088 16.642 5.088 16.642C6.05 18.429 7.7 17.879 8.25 17.604C8.387 16.917 8.662 16.367 8.938 16.092C6.462 15.817 3.988 14.854 3.988 10.592C3.988 9.35403 4.4 8.39203 5.088 7.70403C4.95 7.42903 4.538 6.32903 5.225 4.81703C5.225 4.81703 6.188 4.54203 8.25 5.91703C9.075 5.64203 10.037 5.50403 11 5.50403C11.963 5.50403 12.925 5.64203 13.75 5.91703C15.813 4.54203 16.775 4.81703 16.775 4.81703C17.325 6.32903 17.05 7.42903 16.913 7.70403C17.6 8.52903 18.013 9.49203 18.013 10.592C18.013 14.854 15.4 15.679 12.925 15.954C13.337 16.504 13.75 17.192 13.75 18.154V21.179C13.75 21.454 13.887 21.867 14.575 21.729C18.975 20.217 22.138 16.092 22.138 11.279C22 5.23003 17.05 0.280029 11 0.280029Z" fill="url(#github_paint0_linear)" />
      </g>
    </g>
    <defs>
      <linearGradient id="github_paint0_linear" x1="11.069" y1="0.279029" x2="11.069" y2="21.757" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0.6" />
      </linearGradient>
      <clipPath id="github_clip0">
        <rect width="22" height="22" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const DiscordIcon: SocialIcon = (props) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M18.6239 3.8093C17.2217 3.1659 15.7181 2.69188 14.1459 2.42039C14.1173 2.41515 14.0887 2.42824 14.0739 2.45443C13.8805 2.79838 13.6663 3.24709 13.5163 3.59977C11.8254 3.34661 10.1431 3.34661 8.48679 3.59977C8.33676 3.23925 8.11478 2.79838 7.92053 2.45443C7.90578 2.42912 7.87718 2.41602 7.84855 2.42039C6.27725 2.69101 4.7736 3.16504 3.37052 3.8093C3.35838 3.81453 3.34797 3.82327 3.34106 3.83461C0.488942 8.09561 -0.292371 12.2519 0.0909151 16.3566C0.0926494 16.3767 0.103922 16.3959 0.119532 16.4081C2.00127 17.79 3.82407 18.629 5.61301 19.185C5.64164 19.1938 5.67197 19.1833 5.69019 19.1597C6.11337 18.5818 6.49059 17.9725 6.81402 17.3317C6.83311 17.2942 6.81489 17.2497 6.77588 17.2348C6.17754 17.0078 5.6078 16.7311 5.05975 16.4168C5.0164 16.3915 5.01293 16.3295 5.05281 16.2998C5.16814 16.2134 5.2835 16.1235 5.39363 16.0327C5.41355 16.0161 5.44131 16.0126 5.46474 16.0231C9.06518 17.6669 12.9631 17.6669 16.521 16.0231C16.5445 16.0118 16.5722 16.0153 16.593 16.0318C16.7032 16.1226 16.8185 16.2134 16.9347 16.2998C16.9746 16.3295 16.972 16.3915 16.9286 16.4168C16.3806 16.7372 15.8108 17.0078 15.2116 17.2339C15.1726 17.2488 15.1553 17.2942 15.1744 17.3317C15.5047 17.9716 15.882 18.5809 16.2973 19.1589C16.3147 19.1833 16.3459 19.1938 16.3745 19.185C18.1721 18.629 19.9949 17.79 21.8766 16.4081C21.8931 16.3959 21.9035 16.3776 21.9053 16.3575C22.364 11.612 21.1369 7.48977 18.6525 3.83548C18.6465 3.82327 18.6361 3.81453 18.6239 3.8093ZM7.35169 13.8573C6.26771 13.8573 5.37454 12.8621 5.37454 11.6399C5.37454 10.4177 6.25039 9.42255 7.35169 9.42255C8.46163 9.42255 9.34616 10.4265 9.32881 11.6399C9.32881 12.8621 8.45296 13.8573 7.35169 13.8573ZM14.6619 13.8573C13.5779 13.8573 12.6847 12.8621 12.6847 11.6399C12.6847 10.4177 13.5606 9.42255 14.6619 9.42255C15.7718 9.42255 16.6563 10.4265 16.639 11.6399C16.639 12.8621 15.7718 13.8573 14.6619 13.8573Z" fill="url(#discord_paint0_linear)" />
    <defs>
      <linearGradient id="discord_paint0_linear" x1="11.0006" y1="2.41981" x2="11.0006" y2="19.1873" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0.6" />
      </linearGradient>
    </defs>
  </svg>
);


const socialLinks: { href: string; label: string; Icon: SocialIcon }[] = [
  { href: "https://x.com/nexis_network", label: "X / Twitter", Icon: TwitterIcon },
  { href: "https://github.com/nexis-ai", label: "GitHub", Icon: GithubIcon },
  { href: "https://discord.gg/nexis-network", label: "Discord", Icon: DiscordIcon },
];

export type SiteFooterProps = {
  className?: string;
};

const isExternalLink = (href: string) => href.startsWith("http") || href.startsWith("mailto:");

export function SiteFooter({ className }: SiteFooterProps) {
  const t = useTranslations();
  const year = new Date().getFullYear();
  const translateMarketing = (label: string) =>
    translateMarketingLabel((key) => t(`marketing.${key}`), label);



  return (
    <footer role="contentinfo" className={cn("bg-background pt-8 sm:pt-20", className)}>

      <div className="mx-auto max-w-5xl space-y-16 px-6">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="max-w-xs space-y-6 md:col-span-2">
            <Link href="/" aria-label={t("footer.homeAria")} className="block size-fit">
              <Image
                src="/logo/nexis-logo-full-dark.svg"
                alt="Nexis Network"
                width={120}
                height={32}
                style={{ width: "auto", height: "auto" }}
                className="block"
                priority
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
            <p className="text-sm text-muted-foreground">{t("footer.location")}</p>
          </div>

          <div className="flex flex-wrap items-start gap-3 text-sm">
            <LocaleSwitcher />
            {socialLinks.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={translateMarketing(label)}
                className="text-muted-foreground hover:text-primary block"
              >
                <Icon className="size-5" />
              </Link>
            ))}
          </div>
        </div>

        <div
          aria-hidden
          className="h-px bg-size-[6px_1px] bg-repeat-x opacity-25 bg-[linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)]"
        />

        <div className="grid gap-12 lg:grid-cols-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 lg:col-span-4">
            {footerLinkGroups.map((linkGroup) => (
              <div key={linkGroup.group} className="space-y-4 text-sm">
                <span className="block font-medium">{translateMarketingLabel((key) => t(`marketing.${key}`), linkGroup.group)}</span>
                <div className="flex flex-wrap gap-4 sm:flex-col">
                  {linkGroup.items.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="text-muted-foreground hover:text-primary block duration-150"
                      target={isExternalLink(item.href) ? "_blank" : undefined}
                      rel={isExternalLink(item.href) ? "noopener noreferrer" : undefined}
                    >
                      {translateMarketingLabel((key) => t(`marketing.${key}`), item.title)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2">
            <form className="ml-auto w-full space-y-4 md:max-w-xs">
              <Label className="block text-sm font-medium" htmlFor="footer-email">
                {t("footer.subscribeTitle")}
              </Label>
              <div className="flex gap-2">
                <Input
                  className="bg-background ring-foreground/10 h-9 border-transparent shadow ring-1"
                  placeholder={t("common.yourEmail")}
                  type="email"
                  id="footer-email"
                  required
                  name="email"
                />
                <Button type="submit" size="sm">
                  {t("common.subscribe")}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("footer.subscribeBody")}
              </p>
            </form>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-4 border-t border-border py-8">
          <span className="text-muted-foreground text-sm">© {year} {t("footer.rightsReserved")}</span>
          <div className="ring-foreground/5 bg-card flex items-center gap-2 rounded-full border border-transparent py-1 pl-2 pr-4 shadow ring-1">
            <div className="relative flex size-3">
              <span className="duration-1500 absolute inset-0 block size-full animate-pulse rounded-full bg-emerald-100" />
              <span className="relative m-auto block size-1 rounded-full bg-[#8eb94f]" />
            </div>
            <span className="text-sm">{t("footer.allSystemsNormal")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
