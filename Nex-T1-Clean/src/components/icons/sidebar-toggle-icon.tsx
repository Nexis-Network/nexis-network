"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type SidebarToggleIconProps = {
  className?: string;
};

export function SidebarToggleIcon({ className }: SidebarToggleIconProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      src="/assets/sidebar-toggle.svg"
      width={63}
      height={63}
      className={cn("h-auto w-auto shrink-0", className)}
    />
  );
}
