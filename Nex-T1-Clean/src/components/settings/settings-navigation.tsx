"use client";

import { BookOpen, Bot, Building2, Code2, CreditCard, Database, KeyRound, LifeBuoy, ListChecks, Plug, ShieldCheck, Users, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { FileIcon, CopyIcon, PlusIcon } from "@/components/sidebar-03/animated-icons";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/animate-ui/components/radix/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { cn } from "@/lib/utils";

import { motion } from "framer-motion";
type NavLeaf = { label: string; href: string };
type NavNode = { label: string; href?: string; children?: NavLeaf[] };

const SETTINGS_NAVIGATION_ITEMS: NavNode[] = [
  { label: "Overview", href: "/settings" },
  {
    label: "Account",
    children: [
      { label: "Account Details", href: "/settings/account-details" },
      { label: "Connections", href: "/settings/connections" },
      { label: "Trading", href: "/settings/trading" },
      { label: "Security", href: "/settings/security" },
      { label: "Wallets", href: "/settings/wallets" },
      { label: "Documents", href: "/settings/documents" },
      { label: "Memory", href: "/settings/memory" },
    ],
  },
  {
    label: "AI Arena",
    children: [
      { label: "AI Leaderboard", href: "/ai-leaderboard" },
      { label: "Marketplace", href: "/agents" },
      { label: "My Agents", href: "/settings/agents" },
      { label: "Artifacts", href: "/settings/artifacts" },
      { label: "Create Agent", href: "/agents/new" },
      { label: "Strategy Builder", href: "/agents/strategy-lab" },
      { label: "Agent Settings", href: "/settings/agent" },
      { label: "Agent Spend", href: "/settings/agent-spend" },
      { label: "Assistant", href: "/settings/assistant" },
      { label: "Automations", href: "/settings/automation" },
      { label: "Knowledge Base", href: "/settings/knowledge-base" },
    ],
  },
  {
    label: "Workspace",
    children: [
      { label: "Organization", href: "/settings/organization" },
      { label: "Projects", href: "/settings/projects" },
      { label: "Earn", href: "/settings/earn" },
      { label: "Referrals", href: "/settings/invitations" },
    ],
  },
  { label: "Billing", href: "/settings/billing" },
  {
    label: "Developer",
    children: [
      { label: "API Console", href: "/settings/api" },
      { label: "API Products", href: "/settings/developer/products" },
      { label: "Usage & Billing", href: "/settings/developer/usage" },
      { label: "Request Logs", href: "/settings/developer/logs" },
      { label: "API Keys", href: "/settings/developer/api-keys" },
      { label: "Cache", href: "/settings/developer/cache" },
    ],
  },
  { label: "Support", href: "/settings/support" },
  { label: "Vesting", href: "/vesting" },
  { label: "Changelog", href: "/changelog" },
] as const;

const SettingsNavigation = () => {

  const pathname = usePathname() ?? "";

  const [hoverItem, setHoverItem] = useState<number | null>(null);

  const { data: profileData } = useProfileAggregate();

  const xpValue = useMemo(() => {
    const metadata = (profileData?.identity?.metadata ?? null) as Record<string, UntypedJson> | null;
    const xpCandidates: UntypedJson[] = [];
    if (metadata && typeof metadata === "object") {
      xpCandidates.push(metadata["xp"], metadata["experience"], metadata["totalXp"]);
    }
    const aggregate = profileData as Record<string, UntypedJson> | undefined;
    if (aggregate) {
      xpCandidates.push(aggregate["xp"], aggregate["totalXp"], aggregate?.usage && (aggregate.usage as Record<string, UntypedJson>)["xp"]);
    }

    for (const candidate of xpCandidates) {
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return Math.max(0, Math.floor(candidate));
      }
      if (typeof candidate === "string") {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) {
          return Math.max(0, Math.floor(parsed));
        }
      }
    }

    return 0;
  }, [profileData]);

  const formattedXp = useMemo(() => {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(xpValue);
  }, [xpValue]);

  const normalize = (value: string) => value.replace(/\/$/, "");
  const normalizedPath = useMemo(() => normalize(pathname || ""), [pathname]);

  const isActiveHref = (href: string) => {
    const normalized = normalize(href);
    if (normalized === "/settings") return normalizedPath === "/settings";
    return normalizedPath.startsWith(normalized);
  };

  const getNodeActive = (node: NavNode) => {
    if (node.href) return isActiveHref(node.href);
    if (node.children) return node.children.some((child) => isActiveHref(child.href));
    return false;
  };

  return (
    <div className="font-sans relative w-full">
      <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--settings-app-bg)]">
        <header className="flex flex-wrap items-center gap-4 bg-[var(--settings-app-bg)] px-6 py-4 text-sm text-[var(--settings-foreground-strong)]">
          <div className="flex shrink-0 items-center">
            <Link
              href="/app"
              aria-label="Return to dashboard"
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--settings-border-strong)]/30"
            >
              <Image
                src="/logo/nexis-logo-full-dark.svg"
                alt="Nexis logo"
                width={78}
                height={17}
                className="h-[17px] w-auto"
                style={{ width: "auto" }}
              />
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <Badge
              variant="outline"
              className="rounded-full border-[var(--settings-border-soft)] bg-[var(--settings-elevated)] px-3 py-1 text-[11px] font-regular uppercase tracking-wide text-[var(--settings-foreground-muted)]"
            >
              {formattedXp} xp
            </Badge>
            <WalletTriggerButton />
            <UserProfileMenu />
          </div>
        </header>
        <nav className="border-b border-[var(--settings-border-soft)] bg-[var(--settings-app-bg)] text-sm">
          <motion.div
            className="scrollbar-hide relative flex gap-2 overflow-y-visible overflow-x-scroll whitespace-nowrap px-6 py-1 text-sm"
          >
            {SETTINGS_NAVIGATION_ITEMS.map((item, index) => {
              const isActive = getNodeActive(item);
              const baseClasses = cn(
                "relative flex items-center justify-center px-2 py-2 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground",
              );

              if (item.children && item.children.length > 0) {
                return (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onMouseEnter={() => setHoverItem(index)}
                        className={cn(baseClasses, "gap-1")}
                      >
                        {item.label}
                        <span className="text-xs text-muted-foreground">▾</span>
                        {isActive && <motion.div layoutId="underline" className="bg-[var(--settings-foreground-strong)] absolute -bottom-1 left-0 h-[2px] w-full rounded-3xl" />}
                        {hoverItem === index && (
                          <motion.div
                            style={{ borderRadius: "10px" }}
                            layoutId="hoverBg"
                            transition={{ duration: 0.2 }}
                            className="bg-[var(--settings-foreground-strong)]/5 absolute inset-0 left-0"
                          />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {item.children.map((child) => {
                        const childActive = isActiveHref(child.href);
                        const icon = (() => {
                          switch (child.label) {
                            case "Account Details":
                              return <Users className="size-4" />;
                            case "Connections":
                              return <Plug className="size-4" />;
                            case "Trading":
                              return <Zap className="size-4" />;
                            case "Security":
                              return <ShieldCheck className="size-4" />;
                            case "Wallets":
                              return <Wallet className="size-4" />;
                            case "Documents":
                              return <FileIcon className="size-4" />;
                            case "Memory":
                              return <Database className="size-4" />;
                            case "My Agents":
                            case "Agent Settings":
                              return <Bot className="size-4" />;
                            case "Agent Spend":
                              return <CreditCard className="size-4" />;
                            case "AI Leaderboard":
                              return <Zap className="size-4" />;
                            case "Marketplace":
                              return <CopyIcon className="size-4" />;
                            case "Artifacts":
                              return <FileIcon className="size-4" />;
                            case "Automations":
                              return <Zap className="size-4" />;
                            case "Create Agent":
                              return <PlusIcon className="size-4" />;
                            case "Strategy Builder":
                              return <ListChecks className="size-4" />;
                            case "Assistant":
                              return <Bot className="size-4" />;
                            case "Knowledge Base":
                              return <BookOpen className="size-4" />;
                            case "API Keys":
                              return <KeyRound className="size-4" />;
                            case "API Console":
                              return <Code2 className="size-4" />;
                            case "API Products":
                              return <BookOpen className="size-4" />;
                            case "Usage & Billing":
                              return <CreditCard className="size-4" />;
                            case "Request Logs":
                              return <ListChecks className="size-4" />;
                            case "Billing":
                              return <CreditCard className="size-4" />;
                            case "Organization":
                              return <Building2 className="size-4" />;
                            case "Projects":
                              return <ListChecks className="size-4" />;
                            case "Earn":
                              return <CreditCard className="size-4" />;
                            case "Referrals":
                              return <Users className="size-4" />;
                            case "Support":
                              return <LifeBuoy className="size-4" />;
                            case "Cache":
                              return <Database className="size-4" />;
                            default:
                              return <ListChecks className="size-4" />;
                          }
                        })();
                        return (
                          <DropdownMenuItem key={child.href} asChild>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 transition-colors duration-150",
                                childActive && "font-medium",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                {icon}
                                {child.label}
                              </span>
                              {childActive && <span className="text-[10px]">•</span>}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              if (!item.href) return null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoverItem(index)}
                  className={baseClasses}
                >
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="underline"
                      className="bg-foreground absolute -bottom-1 left-0 h-[2px] w-full rounded-3xl"
                    />
                  )}
                  {hoverItem === index && (
                    <motion.div
                      style={{ borderRadius: "10px" }}
                      layoutId="hoverBg"
                      transition={{ duration: 0.2 }}
                      className="bg-foreground/5 absolute inset-0 left-0"
                    />
                  )}
                </Link>
              );
            })}
          </motion.div>
        </nav>
      </div>
    </div>
  );
};

const UserProfileMenu = dynamic(
  () => import("@/components/app-header/user-profile-menu").then((m) => m.default),
  { ssr: false },
);

const WalletsSidebarFlyout = dynamic(
  () => import("@/components/sidebar/wallets/wallets-sidebar-flyout").then((m) => m.WalletsSidebarFlyout),
  { ssr: false },
);

function WalletTriggerButton() {
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const { data: profileData } = useProfileAggregate();
  const wallets = useMemo(() => {
    return Array.isArray(profileData?.wallets) ? profileData.wallets : [];
  }, [profileData?.wallets]);

  const totalNetWorthUsd = useMemo(() => {
    return wallets.reduce((sum, wallet) => {
      const value = typeof wallet.netWorthUsd === "number" && Number.isFinite(wallet.netWorthUsd) ? wallet.netWorthUsd : 0;
      return sum + value;
    }, 0);
  }, [wallets]);

  const formattedBalance = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalNetWorthUsd);
  }, [totalNetWorthUsd]);

  return (
    <>
      <button
        type="button"
        data-testid="settings-wallet-trigger"
        onClick={() => setIsWalletOpen(true)}
        className="hidden items-center gap-3 px-1.5 py-1.5 text-sm font-medium text-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-0 dark:text-[var(--bento-text-primary)] sm:flex"
      >
        <div className="relative flex h-[21px] w-[21px] rounded-md border border-[var(--settings-border-soft)] bg-[var(--settings-elevated)]/80 backdrop-blur-md">
          <Wallet className="h-full w-full p-[3px] text-foreground dark:text-[var(--bento-text-primary)]" />
        </div>
        <span className="text-[0.85rem] font-medium tracking-wide text-foreground dark:text-[var(--bento-text-primary)]">
          {formattedBalance}
        </span>
      </button>
      <WalletsSidebarFlyout isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </>
  );
}

export { SettingsNavigation };
