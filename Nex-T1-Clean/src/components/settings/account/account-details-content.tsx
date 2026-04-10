"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, LayoutGrid, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { ProfileAccountHealthCard } from "@/components/settings/profile/profile-account-health-card";
import { ProfileAccountSummary } from "@/components/settings/profile/profile-account-summary";
import { ProfileAlertsCard } from "@/components/settings/profile/profile-alerts-card";
import { ProfileAvatarCard } from "@/components/settings/profile/profile-avatar-card";
import { ProfileContactCard } from "@/components/settings/profile/profile-contact-card";
import { ProfileIdentityForm } from "@/components/settings/profile/profile-identity-form";
import { ProfilePushNotificationsCard } from "@/components/settings/profile/profile-push-notifications-card";
import { ProfileQuickActionsCard } from "@/components/settings/profile/profile-quick-actions-card";
import { ProfileSessionControlsCard } from "@/components/settings/profile/profile-session-controls-card";
import { ProfileSessionsCard } from "@/components/settings/profile/profile-sessions-card";
import {
  SettingsPage,
  SettingsPageHeader,
  SettingsSection,
} from "@/components/settings-v2/primitives/page";
import { SessionListCard } from "@/components/settings/security/session-list";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";

type QuickLink = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const QUICK_LINKS: QuickLink[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Profile completion and account health.",
    icon: LayoutGrid,
  },
  {
    id: "identity-profile",
    label: "Identity & Profile",
    description: "Photo, generated avatar, bio, and contact email.",
    icon: UserRound,
  },
  {
    id: "security-sessions",
    label: "Security & Sessions",
    description: "Alerts, sign-ins, and active device controls.",
    icon: ShieldCheck,
  },
];

export default function AccountDetailsPage() {
  const { data, isLoading } = useProfileAggregate();
  const identity = data?.identity;

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Account Details"
        description="Manage profile identity, generated avatars, and session security from one place."
      />

      <SettingsSection
        title="Quick navigation"
        description="Jump between the main identity, overview, and security areas without another wrapper layer."
        action={
          <Link
            href="/settings/account?tab=security"
            className="inline-flex items-center gap-1 text-xs text-[var(--settings-foreground-muted)] transition-colors hover:text-[var(--settings-foreground-strong)]"
          >
            Security settings
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.id}
              href={`#${item.id}`}
              aria-label={item.label}
              className="group rounded-[16px] border border-[var(--settings-border-soft)] bg-[rgba(28,28,29,0.56)] px-4 py-3 transition-colors hover:border-[var(--settings-border)]/8 hover:bg-[rgba(28,28,29,0.76)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--settings-foreground-strong)]">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 text-[var(--settings-foreground-subtle)]"
                  aria-hidden="true"
                />
              </div>
              <p aria-hidden="true" className="mt-1 text-xs leading-5 text-[var(--settings-foreground-muted)]">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </SettingsSection>

      <section id="overview" className="space-y-4 scroll-mt-24">
        <SectionHeader title="Overview" description="Track completion, health signals, and quick account actions." />

        <ProfileAccountSummary data={data} isLoading={isLoading} />

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <ProfileAccountHealthCard data={data} isLoading={isLoading} />
          <ProfileQuickActionsCard />
          <ProfilePushNotificationsCard />
        </div>
      </section>

      <section id="identity-profile" className="space-y-4 scroll-mt-24">
        <SectionHeader
          title="Identity & Profile"
          description="Control your public profile details, uploaded photo, generated avatar, and contact email."
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <ProfileAvatarCard identity={identity} isLoading={isLoading} />
          <ProfileContactCard identity={identity} isLoading={isLoading} />
        </div>

        <ProfileIdentityForm identity={identity} isLoading={isLoading} />
      </section>

      <section id="security-sessions" className="space-y-4 scroll-mt-24">
        <SectionHeader
          title="Security & Sessions"
          description="Review account alerts, sign-out controls, and active sessions across devices."
        />

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <ProfileSessionControlsCard identity={identity} isLoading={isLoading} />
          <ProfileAlertsCard alerts={data?.alerts} isLoading={isLoading} />
          <ProfileSessionsCard sessions={data?.sessions} isLoading={isLoading} />
        </div>

        <SessionListCard />
      </section>
    </SettingsPage>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-medium text-[var(--settings-foreground-strong)]">{title}</h2>
      <p className="text-sm text-[var(--settings-foreground-muted)]">{description}</p>
    </div>
  );
}
