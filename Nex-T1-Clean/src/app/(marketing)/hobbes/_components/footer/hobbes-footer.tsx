import Link from "next/link";
import type { ReactElement } from "react";

import {
  HOBBES_FOOTER_CTA_CARDS,
  HOBBES_FOOTER_LINK_GROUPS,
  HOBBES_FOOTER_SOCIAL_LINKS,
} from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-data";
import { HobbesFooterCtaCard } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-cta-card";
import { hobbesFooterMono, hobbesFooterSans } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-fonts";
import { HobbesFooterNavGroup } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-nav-group";

export function HobbesFooter(): ReactElement {
  return (
    <footer className={`${hobbesFooterSans.className} bg-[#F5F5F5] text-[#171717]`}>
      <div className="mx-auto flex w-full max-w-[1694px] flex-col px-4 sm:px-6">
        <div className="grid gap-1 xl:grid-cols-2">
          {HOBBES_FOOTER_CTA_CARDS.map((card) => (
            <HobbesFooterCtaCard key={card.eyebrow} card={card} />
          ))}
        </div>

        <div className="flex flex-col gap-14 px-0 pb-6 pt-12">
          <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-5 xl:gap-12">
            {HOBBES_FOOTER_LINK_GROUPS.map((group) => (
              <HobbesFooterNavGroup key={group.title} group={group} />
            ))}
          </div>

          <div className="flex flex-col gap-5 border-t border-black/[0.08] pt-6 md:flex-row md:items-center md:justify-between">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {HOBBES_FOOTER_SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${hobbesFooterMono.className} inline-flex min-h-6 items-center text-[12px] leading-4 uppercase text-[#171717] transition-opacity duration-150 hover:opacity-60`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className={`${hobbesFooterMono.className} text-[12px] leading-4 text-[#797979]`}>LAYERZERO 2026</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
