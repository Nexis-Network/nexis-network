"use client";

import { cn } from "@/lib/utils";

interface PortfolioLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}

export function PortfolioLayout({
  children,
  sidebar,
  className,
}: PortfolioLayoutProps) {
  return (
    <div
      className={cn("grid w-full grid-cols-1 gap-8 lg:grid-cols-4", className)}
    >
      {/* Main Content Area (75% width on desktop -> 3/4 cols) */}
      <div className="min-w-0 lg:col-span-3">{children}</div>

      {/* Sidebar Area (25% width on desktop -> 1/4 cols) */}
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-1">{sidebar}</div>
    </div>
  );
}
