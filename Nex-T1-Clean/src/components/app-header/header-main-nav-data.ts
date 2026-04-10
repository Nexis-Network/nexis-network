import type { LucideIcon } from "lucide-react";
import {
  BarChart,
  Cpu,
  Droplets,
  Globe,
  Monitor,
  Settings,
  Store,
  Timer,
  Trophy,
  User,
  WalletCards,
} from "lucide-react";

import { DAO_NAV_ITEMS } from "@/components/app-header/dao-nav-items";

export type HeaderMainNavSubmenuItem = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
};

export type HeaderMainNavItem = {
  id: string;
  href: string;
  title: string;
  submenu: HeaderMainNavSubmenuItem[];
};

export type HeaderMainNavMenuSection = {
  title: string;
  items: HeaderMainNavSubmenuItem[];
  isLarge?: boolean;
};

export type HeaderMainNavMobileItem = {
  id: string;
  href: string;
  title: string;
};

type HeaderMainNavMenuLayoutSection = {
  title: string;
  itemIds: readonly string[];
  isLarge?: boolean;
};

type HeaderMainNavMenuLayout = {
  firstUl: HeaderMainNavMenuLayoutSection;
  secondUl?: HeaderMainNavMenuLayoutSection;
  thirdUl?: HeaderMainNavMenuLayoutSection;
};

export const HEADER_MAIN_NAV_ITEMS: HeaderMainNavItem[] = [
  {
    id: "trade",
    href: "/screener",
    title: "Trade",
    submenu: [
      { id: "trade-terminal", title: "Trading Terminal", href: "/screener", icon: Monitor },
      { id: "trade-liquidity", title: "Liquidity", href: "/defi/liquidity", icon: Droplets },
    ],
  },
  {
    id: "daos",
    href: "/daos",
    title: "DAOs",
    submenu: DAO_NAV_ITEMS,
  },
  {
    id: "agents",
    href: "/marketplace",
    title: "Agents",
    submenu: [
      { id: "agents-marketplace", title: "Agent Marketplace", href: "/marketplace", icon: Store },
      { id: "agents-leaderboard", title: "AI Leaderboard", href: "/ai-leaderboard", icon: Trophy },
      { id: "agents-my-agents", title: "My Agents", href: "/settings/agents", icon: User },
      { id: "agents-mcp", title: "MCP Directory", href: "/mcp", icon: Cpu },
      { id: "agents-analytics", title: "Agent Analytics", href: "/analytics", icon: BarChart },
    ],
  },
  {
    id: "profile",
    href: "/settings/wallets",
    title: "Profile",
    submenu: [
      { id: "profile-wallets", title: "Agent Wallets", href: "/settings/wallets", icon: WalletCards },
      { id: "profile-my-agents", title: "My Agents", href: "/settings/agents", icon: User },
      { id: "profile-vesting", title: "Vesting", href: "/vesting", icon: Timer },
      { id: "profile-portal", title: "Nexis Portal", href: "https://portal.nex-t1.ai", icon: Globe },
      { id: "profile-settings", title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const HEADER_MAIN_NAV_MENU_LAYOUTS: Record<HeaderMainNavItem["id"], HeaderMainNavMenuLayout> = {
  trade: {
    firstUl: {
      title: "Trade",
      itemIds: ["trade-terminal"],
      isLarge: true,
    },
    secondUl: {
      title: "Liquidity",
      itemIds: ["trade-liquidity"],
    },
  },
  daos: {
    firstUl: {
      title: "DAOs",
      itemIds: ["daos-directory"],
      isLarge: true,
    },
    secondUl: {
      title: "Workspace",
      itemIds: ["daos-mine"],
    },
  },
  agents: {
    firstUl: {
      title: "Agents",
      itemIds: ["agents-marketplace", "agents-leaderboard"],
      isLarge: true,
    },
    secondUl: {
      title: "Operator Tools",
      itemIds: ["agents-my-agents", "agents-mcp"],
    },
    thirdUl: {
      title: "Insights",
      itemIds: ["agents-analytics"],
    },
  },
  profile: {
    firstUl: {
      title: "Profile",
      itemIds: ["profile-wallets", "profile-my-agents"],
      isLarge: true,
    },
    secondUl: {
      title: "Account",
      itemIds: ["profile-vesting", "profile-settings"],
    },
    thirdUl: {
      title: "Explore",
      itemIds: ["profile-portal"],
    },
  },
};

export const HEADER_MAIN_NAV_MOBILE_ITEMS: HeaderMainNavMobileItem[] = [
  { id: "chat", href: "/app", title: "Chat" },
  ...HEADER_MAIN_NAV_ITEMS.map(({ href, id, title }) => ({ href, id, title })),
  { id: "docs", href: "/docs", title: "Docs" },
];

export function isHeaderMainNavPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveHeaderMainNavMenuSection(
  item: HeaderMainNavItem,
  layoutSection?: HeaderMainNavMenuLayoutSection,
): HeaderMainNavMenuSection | null {
  if (!layoutSection) {
    return null;
  }

  const submenuItemsById = new Map(
    item.submenu.map((submenuItem) => [submenuItem.id, submenuItem]),
  );
  const items = layoutSection.itemIds.flatMap((itemId) => {
    const submenuItem = submenuItemsById.get(itemId);
    return submenuItem ? [submenuItem] : [];
  });

  if (items.length === 0) {
    return null;
  }

  return {
    title: layoutSection.title,
    items,
    isLarge: layoutSection.isLarge,
  };
}

export function buildHeaderMainNavMenuSections(
  item: HeaderMainNavItem,
): HeaderMainNavMenuSection[] {
  const layout = HEADER_MAIN_NAV_MENU_LAYOUTS[item.id];
  const sections = [
    resolveHeaderMainNavMenuSection(item, layout.firstUl),
    resolveHeaderMainNavMenuSection(item, layout.secondUl),
    resolveHeaderMainNavMenuSection(item, layout.thirdUl),
  ];
  return sections.filter((section): section is HeaderMainNavMenuSection => section !== null);
}
