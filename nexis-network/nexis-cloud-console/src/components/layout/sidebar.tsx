"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "@/components/layout/dashboard-nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border-default h-full bg-background-page flex flex-col fixed left-0 top-0 pt-16 z-30 hidden md:flex">
      <div className="flex flex-col gap-2 p-4">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm font-medium",
                isActive 
                  ? "bg-accent-sky/10 text-accent-sky" 
                  : "text-text-secondary hover:text-text-primary hover:bg-background-card"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto p-4 border-t border-border-default">
        <div className="text-xs text-text-muted">
          Nexis Cloud Console
          <br />
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
