import Link from "next/link";
import type { ReactElement } from "react";

import type { HobbesFooterCtaCard } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-data";
import { hobbesFooterMono } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-fonts";

type HobbesFooterCtaCardProps = {
  card: HobbesFooterCtaCard;
};

export function HobbesFooterCtaCard({ card }: HobbesFooterCtaCardProps): ReactElement {
  const buttonClassName =
    card.variant === "solid"
      ? "border-[#0A0A0A] bg-[#0A0A0A] text-[#F0F0F0]"
      : "border-[rgba(0,0,0,0.16)] bg-white text-[#171717]";
  const buttonWidthClassName = card.variant === "solid" ? "min-w-[124px]" : "min-w-[127px]";
  const buttonRadiusClassName =
    card.actionLabel === "Get Connected" || card.actionLabel === "Read the Paper" ? "rounded-full" : "rounded-md";

  return (
    <article className="flex min-h-[280px] flex-col justify-between gap-14 bg-[#F0F0F0] p-6 xl:min-h-[360px]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <h2 className="max-w-[15ch] text-[2rem] leading-[1.05] tracking-[-0.05em] text-[#171717] sm:text-[2.5rem] xl:text-[56px] xl:leading-[64px]">
          {card.title}
        </h2>
        <p className={`${hobbesFooterMono.className} text-[12px] leading-4 text-[#A3A3A3]`}>{card.eyebrow}</p>
      </div>

      <div className="flex items-end">
        <Link
          href={card.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-8 items-center justify-center border px-3 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.4px] transition-colors duration-150 hover:bg-[#171717] hover:text-[#F5F5F5] ${buttonClassName} ${buttonWidthClassName} ${buttonRadiusClassName}`}
        >
          {card.actionLabel}
        </Link>
      </div>
    </article>
  );
}
