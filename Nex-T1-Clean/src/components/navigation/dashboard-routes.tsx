import type { ReactNode } from "react";

import {
  Blocks,
  History,
  ListTodo,
  MessageCircleMore,
  PieChart,
  ScanSearch,
  Settings2,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type SidebarRouteVariant = "route" | "overlay" | "flyout";

export type SidebarRoute = {
  id: string;
  title: string;
  icon?: ReactNode;
  link?: string;
  labelClassName?: string;
  variant?: SidebarRouteVariant;
  onClick?: () => void;
  actionId?: "chatHistory" | "tasks" | "wallets";
  separator?: boolean;
  subs?: {
    title: string;
    link: string;
    icon?: ReactNode;
  }[];
};

const SIDEBAR_ICON_CLASSNAME = "size-[18px] shrink-0";

const createSidebarIcon = (Icon: LucideIcon) => (
  <Icon className={SIDEBAR_ICON_CLASSNAME} strokeWidth={1.9} />
);

export const dashboardRoutes: SidebarRoute[] = [
  {
    id: "chat",
    title: "Chat",
    icon: createSidebarIcon(MessageCircleMore),
    link: "/app",
  },
  {
    id: "screener",
    title: "Screener",
    icon: createSidebarIcon(ScanSearch),
    link: "/screener",
  },
  {
    id: "chat-history",
    title: "Chat History",
    icon: createSidebarIcon(History),
    variant: "overlay",
    actionId: "chatHistory",
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: createSidebarIcon(ListTodo),
    variant: "overlay",
    actionId: "tasks",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    icon: createSidebarIcon(PieChart),
    link: "/portfolio",
  },

  {
    id: "ai-arena",
    title: "AI Arena",
    icon: createSidebarIcon(Zap),
    link: "/ai-leaderboard",
    labelClassName: "ml-0 flex-1 justify-start text-left",
    subs: [
      { title: "AI Leaderboard", link: "/ai-leaderboard" },
      { title: "Marketplace", link: "/marketplace" },
      { title: "Launches", link: "/launches" },
      { title: "Agents", link: "/agents" },
      { title: "My Agents", link: "/settings/agents" },
      { title: "Create Agent", link: "/agents/new" },
      { title: "Strategy Builder", link: "/agents/strategy-lab" },
    ],
  },
  {
    id: "leaderboard",
    title: "Wallet Leaderboard",
    icon: createSidebarIcon(Trophy),
    link: "/leaderboard",
  },
  {
    id: "mcp",
    title: "MCP",
    icon: createSidebarIcon(Blocks),
    link: "/mcp",
    separator: true,
  },
  {
    id: "settings",
    title: "Settings",
    icon: createSidebarIcon(Settings2),
    link: "/settings",
  },
];
