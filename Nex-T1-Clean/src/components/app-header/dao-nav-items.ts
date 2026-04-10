import type { LucideIcon } from "lucide-react";
import {
  Building2,
  User,
} from "lucide-react";

export type DaoNavItem = {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
};

export const DAO_NAV_ITEMS: DaoNavItem[] = [
  { id: "daos-directory", title: "DAO Directory", href: "/daos", icon: Building2 },
  { id: "daos-mine", title: "My DAOs", href: "/daos?mineOnly=true", icon: User },
];
