"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import BillingContent from "@/components/settings/workspace/billing-content";
import InvitationsContent from "@/components/settings/workspace/invitations-content";
import OrganizationContent from "@/components/settings/workspace/organization-content";
import ProjectsContent from "@/components/settings/workspace/projects-content";
import NztEarnPageClient from "@/components/settings/earn/nzt-earn-page-client";
import QuestsPageClient from "@/components/settings/quests/quests-page-client";
import { Button } from "@/components/settings/shared/settings-button";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { cn } from "@/lib/utils";

function WorkspaceRewardsSection({ activeSubview }: { activeSubview: string }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "invitations", label: "Referrals" },
          { id: "earn", label: "Earn" },
          { id: "quests", label: "Quests" },
        ].map((item) => (
          <Link
            key={item.id}
            href={`/settings/workspace?view=rewards&subview=${item.id}`}
            className={cn(
              "inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors",
              activeSubview === item.id
                ? "border-border bg-secondary text-secondary-foreground"
                : "border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {activeSubview === "earn" ? <NztEarnPageClient /> : null}
      {activeSubview === "quests" ? <QuestsPageClient /> : null}
      {activeSubview === "invitations" ? <InvitationsContent /> : null}
    </section>
  );
}

export function SettingsWorkspaceSection() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") ?? "organization";
  const activeSubview = searchParams.get("subview") ?? "invitations";

  if (activeView === "projects") {
    return <ProjectsContent />;
  }

  if (activeView === "launchpad") {
    return (
      <SettingsPanel
        title="Launchpad control"
        description="Launchpad flows stay canonical under /launchpad/*, but this workspace surface keeps the key entry points nearby."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/launchpad/create">Create campaign</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/launchpad/dashboard">Campaign dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/launches">Launch explorer</Link>
          </Button>
        </div>
      </SettingsPanel>
    );
  }

  if (activeView === "billing") {
    return <BillingContent />;
  }

  if (activeView === "rewards") {
    return <WorkspaceRewardsSection activeSubview={activeSubview} />;
  }

  return <OrganizationContent />;
}
