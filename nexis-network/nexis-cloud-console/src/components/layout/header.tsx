import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { UserMenu } from "@/components/layout/user-menu";
import { Bell } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 border-b border-border-default bg-background-page/80 backdrop-blur-md fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger would go here */}
        <Link href="/" className="font-bold text-xl tracking-tight text-text-primary flex items-center gap-2">
          <Image src="/logo.svg" alt="Nexis Cloud" width={32} height={32} priority />
        </Link>
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-surface border border-border-subtle">
          <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs font-mono text-text-secondary">Mainnet</span>
        </div>

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="text-text-secondary">
          <Bell className="h-5 w-5" />
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}
