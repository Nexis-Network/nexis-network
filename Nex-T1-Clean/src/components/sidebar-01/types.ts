import type { ComponentType } from "react";

type SidebarIcon = ComponentType<{ className?: string }>;

export interface NavItem {
  id: string;
  title: string;
  icon: SidebarIcon;
  href: string;
  isActive?: boolean;
}

export interface FavoriteItem {
  id: string;
  title: string;
  href: string;
  color: string;
}

export interface TeamItem {
  id: string;
  title: string;
  icon: SidebarIcon;
}

export interface TopicItem {
  id: string;
  title: string;
  icon: SidebarIcon;
}

export interface SidebarData {
  navMain: NavItem[];
  navCollapsible: {
    favorites: FavoriteItem[];
    teams: TeamItem[];
    topics: TopicItem[];
  };
}
