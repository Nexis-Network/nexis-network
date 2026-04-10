"use client";

import type { ReactNode } from "react";
import { ShieldCheck, ShieldAlert, Lock, KeyRound, MapPin } from "lucide-react";
import Link from "next/link";

import { BentoCard } from "@/components/settings/shared/bento-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileAggregate } from "@/lib/user/profile";

type ProfileAccountHealthCardProps = {
  data?: ProfileAggregate;
  isLoading: boolean;
};

export function ProfileAccountHealthCard({ data, isLoading }: ProfileAccountHealthCardProps) {
  if (isLoading) {
    return (
      <BentoCard>
        <div className="space-y-1">
          <Skeleton className="h-5 w-32 bg-white/5" />
          <Skeleton className="h-4 w-56 bg-white/5" />
        </div>
        <div className="mt-4" data-settings-row-list>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 py-3"
            >
              <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 bg-white/5" />
                <Skeleton className="h-3 w-48 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </BentoCard>
    );
  }

  const security = data?.security;
  const identity = data?.identity;

  const healthItems: HealthItem[] = [
    {
      id: "mfa",
      label: "Multi-factor authentication",
      description: security?.mfaEnabled ? "Extra layer of protection enabled." : "Protect your account with passkeys or an authenticator app.",
      status: security?.mfaEnabled ? "Healthy" : "Action required",
      badgeVariant: security?.mfaEnabled ? "default" : "destructive",
      icon: security?.mfaEnabled ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <ShieldAlert className="h-5 w-5 text-amber-300" />,
      actionHref: "/settings/security",
      actionLabel: security?.mfaEnabled ? "Manage" : "Enable",
    },
    {
      id: "password",
      label: "Password hygiene",
      description: security?.passwordLastChangedAt
        ? `Last changed ${formatRelativeTime(security.passwordLastChangedAt)}`
        : "Set a strong password to secure your workspace.",
      status: security?.passwordLastChangedAt ? "Healthy" : "Action recommended",
      badgeVariant: security?.passwordLastChangedAt ? "secondary" : "outline",
      icon: <KeyRound className="h-5 w-5 text-sky-300" />,
      actionHref: "/settings/security",
      actionLabel: "Update",
    },
    {
      id: "sessions",
      label: "Active sessions",
      description:
        typeof security?.activeSessionCount === "number"
          ? `${security.activeSessionCount} active devices`
          : "Keep an eye on where you're signed in.",
      status: typeof security?.activeSessionCount === "number" && security.activeSessionCount > 0 ? "Monitoring" : "No sessions",
      badgeVariant: "outline",
      icon: <Lock className="h-5 w-5 text-purple-300" />,
      actionHref: "/settings/security",
      actionLabel: "Review",
    },
    {
      id: "location",
      label: "Preferred locale & time zone",
      description:
        identity?.locale || identity?.timeZone
          ? [identity?.locale, identity?.timeZone].filter(Boolean).join(" · ")
          : "Set your locale to tailor date, time, and language formatting.",
      status: identity?.locale && identity?.timeZone ? "Configured" : "Action recommended",
      badgeVariant: identity?.locale && identity?.timeZone ? "secondary" : "outline",
      icon: <MapPin className="h-5 w-5 text-blue-300" />,
      actionHref: "/settings#identity",
      actionLabel: identity?.locale && identity?.timeZone ? "Update" : "Set locale",
    },
  ];

  return (
    <BentoCard>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-[var(--bento-text-primary)]">Account Health</h3>
        <p className="text-xs text-[var(--bento-text-muted)]">
          Stay ahead of security and configuration tasks.
        </p>
      </div>

      <div className="mt-4" data-settings-row-list>
        {healthItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 py-3"
          >
            <div className="mt-1">{item.icon}</div>
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-regular text-[var(--bento-text-primary)]">{item.label}</p>
                <Badge variant={item.badgeVariant}>{item.status}</Badge>
              </div>
              <p className="text-xs text-[var(--bento-text-muted)]">{item.description}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={item.actionHref}>{item.actionLabel}</Link>
            </Button>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "\u2014";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "\u2014";
  const diff = Date.now() - timestamp.getTime();
  const absolute = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absolute < hour) {
    const minutes = Math.max(1, Math.round(absolute / minute));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (absolute < day) {
    const hours = Math.max(1, Math.round(absolute / hour));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.max(1, Math.round(absolute / day));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

type HealthItem = {
  id: string;
  label: string;
  description: string;
  status: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  icon: ReactNode;
  actionHref: string;
  actionLabel: string;
};
