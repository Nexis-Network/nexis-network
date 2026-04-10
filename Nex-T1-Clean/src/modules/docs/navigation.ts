import type { LucideIcon } from "lucide-react";

import { DOCS_PAGES } from "@/modules/docs/pages";

export type DocsNavItem = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
};

export const DOCS_NAV_ITEMS: DocsNavItem[] = DOCS_PAGES.map((page) => ({
  id: page.id,
  title: page.title,
  href: page.href,
  icon: page.icon,
}));
