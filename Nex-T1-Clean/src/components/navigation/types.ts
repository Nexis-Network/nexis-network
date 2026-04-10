import type { ComponentType } from "react";

export type IconComponent = ComponentType<{ className?: string }>;

export type FavoriteItem = {
  id: string;
  title: string;
  href: string;
  color: string;
};

export type TeamItem = {
  id: string;
  title: string;
  icon: IconComponent;
};

export type TopicItem = {
  id: string;
  title: string;
  icon: IconComponent;
};

export type NavMainItem = {
  id: string;
  title: string;
  icon: IconComponent;
  href: string;
};

export type SidebarData = {
  navMain: NavMainItem[];
  navCollapsible: {
    favorites: FavoriteItem[];
    teams: TeamItem[];
    topics: TopicItem[];
  };
};
