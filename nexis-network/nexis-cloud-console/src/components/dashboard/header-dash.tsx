"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { UserMenu } from "@/components/layout/user-menu";
import { dashboardNavItems } from "@/components/layout/dashboard-nav";

export function DashboardHeader() {
  const pathname = usePathname();

  return (
    <div className="fixed top-0 left-0 right-0 z-40 border-b border-border-default bg-background-page/80 backdrop-blur-md">
      <header className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-text-primary">
            <Image src="/logo.svg" alt="Nexis Cloud" width={32} height={32} priority />
          </Link>
          <Breadcrumbs />
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border-subtle bg-background-surface px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-xs font-mono text-text-secondary">Mainnet</span>
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="text-text-secondary" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <UserMenu />
        </div>
      </header>

      <nav aria-label="Dashboard" className="border-border-default/60">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap px-6 py-2 text-sm">
          {dashboardNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-sky/10 text-accent-sky"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-card"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
