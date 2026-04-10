import Link from "next/link";
import type { ReactElement } from "react";

import type { HobbesFooterLinkGroup } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-data";
import { hobbesFooterMono } from "@/app/(marketing)/hobbes/_components/footer/hobbes-footer-fonts";

type HobbesFooterNavGroupProps = {
  group: HobbesFooterLinkGroup;
};

export function HobbesFooterNavGroup({ group }: HobbesFooterNavGroupProps): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <h3 className={`${hobbesFooterMono.className} text-[12px] leading-4 uppercase text-[#797979]`}>{group.title}</h3>
      <ul className="flex flex-col gap-1">
        {group.items.map((item) => (
          <li key={`${group.title}-${item.label}`}>
            <Link
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-6 items-center text-[16px] leading-6 text-[#171717] transition-opacity duration-150 hover:opacity-60"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
