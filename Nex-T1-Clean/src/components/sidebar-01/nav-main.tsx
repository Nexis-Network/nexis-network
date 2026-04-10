"use client";

import Link from "next/link";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavItem } from "./types";

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={item.isActive}
                tooltip={item.title}
                className="h-auto min-h-9 rounded-lg px-3 py-2 text-[13px] leading-5 text-[#c9c9c9] hover:bg-white/5 hover:text-white data-[active=true]:bg-white/7 data-[active=true]:text-white"
              >
                <Link href={item.href}>
                  {Icon && <Icon className="mt-0.5 mr-2 h-4 w-4 shrink-0" />}
                  <span className="whitespace-normal text-left">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
