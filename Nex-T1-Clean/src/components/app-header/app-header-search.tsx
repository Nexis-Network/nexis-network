"use client";

import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEARCH_ICON_MASK_STYLE: CSSProperties = {
  WebkitMaskImage: "url('/assets/interface/Search.svg')",
  maskImage: "url('/assets/interface/Search.svg')",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
};

export type SearchItem = {
  title: string;
  href: string;
  description?: string;
  group: string;
};

export const SEARCH_ITEMS: SearchItem[] = [
  { title: "Chat", href: "/", description: "AI agent chat workspace", group: "Pages" },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    description: "Track top performing wallets",
    group: "Pages",
  },
  {
    title: "Marketplace",
    href: "/marketplace",
    description: "Browse and deploy AI agents",
    group: "Pages",
  },
  {
    title: "Launches",
    href: "/launches",
    description: "Browse live and upcoming agent campaigns",
    group: "Pages",
  },
  {
    title: "Agents",
    href: "/agents",
    description: "Search and open individual agent pages",
    group: "Pages",
  },
  {
    title: "AI Leaderboard",
    href: "/ai-leaderboard",
    description: "Compare top trading agents",
    group: "Pages",
  },
  {
    title: "Settings · Overview",
    href: "/settings",
    description: "Account summary, identity, and quick actions",
    group: "Settings",
  },
  {
    title: "Settings · Security",
    href: "/settings/security",
    description: "MFA, device approvals, and sessions",
    group: "Settings",
  },
  {
    title: "Settings · Wallets",
    href: "/settings/wallets",
    description: "Manage in-app and external wallets",
    group: "Settings",
  },
  {
    title: "Settings · Billing",
    href: "/settings/billing",
    description: "Usage, subscriptions, and invoices",
    group: "Settings",
  },
  {
    title: "Invite Teammates",
    href: "/settings/invitations",
    description: "Share access with your organization",
    group: "Features",
  },
  {
    title: "AI Launchpad",
    href: "/settings/agents",
    description: "Deploy and tokenize autonomous agents",
    group: "Features",
  },
  {
    title: "Campaign Dashboard",
    href: "/launchpad/dashboard",
    description: "Manage campaign operations and investor actions",
    group: "Features",
  },
  {
    title: "Create Agent",
    href: "/agents/new",
    description: "Start a new agent launch",
    group: "Features",
  },
];

export function AppHeaderSearch({ variant = "default" }: { variant?: "default" | "figma" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  const groupedItems = useMemo(() => {
    return SEARCH_ITEMS.reduce<Record<string, SearchItem[]>>((acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    }, {});
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        data-onboarding-id="app-header-search"
        className={cn(
          "text-[var(--auth-nav-text)]",
          variant === "figma"
            ? "size-11 rounded-full hover:bg-[var(--auth-sidebar-button-hover-bg)] hover:text-[var(--auth-nav-text-active)] md:size-5 md:rounded-none md:hover:bg-transparent"
            : "rounded-full",
        )}
      >
        <span className="sr-only">Open Nex-T1 search</span>
        <span aria-hidden className="size-5 bg-current" style={SEARCH_ICON_MASK_STYLE} />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search across pages, settings, and features…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedItems).map(([group, items], index, array) => (
            <div key={group}>
              <CommandGroup heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.href}
                    onSelect={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    {item.description ? (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
              {index < array.length - 1 ? <CommandSeparator /> : null}
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
