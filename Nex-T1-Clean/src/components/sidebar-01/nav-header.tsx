"use client";

import Link from "next/link";

import { Logo } from "@/components/shared/branding/logo";
import { SidebarHeader } from "@/components/ui/sidebar";

export function NavHeader() {
  return (
    <SidebarHeader className="gap-3 px-4 py-4">
      <Link href="/app" className="flex items-center gap-3 text-[#efefef]">
        <Logo width={20} height={20} priority />
        <span className="text-sm font-medium tracking-[0.01em]">Docs</span>
      </Link>
    </SidebarHeader>
  );
}
