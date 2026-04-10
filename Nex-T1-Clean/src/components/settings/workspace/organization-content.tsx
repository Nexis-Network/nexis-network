"use client";

import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BentoCard,
  BentoCardHeader,
} from "@/components/settings/shared/bento-card";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";
import {
  normalizeOrganizationPayload,
  normalizeOrganizationsPayload,
  type Organization,
} from "@/components/settings/workspace/organization-content.utils";

async function fetchOrganizations(): Promise<Organization[]> {
  const res = await fetch("/api/auth/organization/list", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(
      getApiErrorMessage(payload, "Failed to load organizations"),
    );
  }
  const payload = await res.json().catch(() => null);
  return normalizeOrganizationsPayload(payload);
}

async function fetchActiveOrganization(
  organizationId?: string,
): Promise<Organization> {
  const url = organizationId
    ? `/api/auth/organization/get-full-organization?organizationId=${encodeURIComponent(organizationId)}`
    : "/api/auth/organization/get-full-organization";
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(
      getApiErrorMessage(payload, "Failed to load organization details"),
    );
  }
  const payload = await res.json().catch(() => null);
  const organization = normalizeOrganizationPayload(payload);

  if (!organization) {
    throw new Error("Failed to load organization details");
  }

  return organization;
}

export default function Page() {
  return <OrganizationDashboard />;
}

function OrganizationDashboard() {
  const {
    data: organizations,
    isLoading: loadingOrganizations,
    error: orgError,
  } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
    // Auth is enforced server-side by app/(authenticated)/layout.tsx
    enabled: true,
  });

  const organizationList = useMemo(
    () => (Array.isArray(organizations) ? organizations : []),
    [organizations],
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const {
    data: activeOrganization,
    isLoading: loadingActive,
    error: activeError,
    refetch,
  } = useQuery({
    queryKey: ["active-organization", selectedId],
    queryFn: () => fetchActiveOrganization(selectedId),
    enabled: !loadingOrganizations && Boolean(selectedId),
  });

  const updateOrganization = useMutation({
    mutationFn: async (payload: {
      organizationId: string;
      data: Record<string, UntypedJson>;
    }) => {
      const res = await fetch("/api/auth/organization/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          getApiErrorMessage(body, "Failed to update organization"),
        );
      }
      return unwrapApiPayload<UntypedJson>(body) ?? body;
    },
    onSuccess: () => {
      toast.success("Organization updated");
      refetch();
    },
    onError: (error: UntypedJson) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update organization",
      );
    },
  });

  useEffect(() => {
    if (organizationList.length === 0) {
      if (selectedId) {
        setSelectedId(undefined);
      }
      return;
    }

    const hasSelection = organizationList.some(
      (organization) => organization.id === selectedId,
    );
    if (!hasSelection) {
      setSelectedId(organizationList[0].id);
    }
  }, [organizationList, selectedId]);

  const memberList = useMemo(
    () =>
      Array.isArray(activeOrganization?.members)
        ? activeOrganization.members
        : [],
    [activeOrganization?.members],
  );

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Organization"
        description="Manage workspace settings, member access, and invitations."
      />

      <BentoCard>
        <BentoCardHeader title="Workspace Selection" />
        <p className="settings-card-description mb-3">
          Select which organization to manage.
        </p>
        <div className="flex flex-wrap gap-2">
          {loadingOrganizations ? (
            <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading
              organizations…
            </div>
          ) : orgError ? (
            <div className="text-sm text-destructive">
              {orgError instanceof Error
                ? orgError.message
                : "Unable to fetch organizations."}
            </div>
          ) : organizationList.length === 0 ? (
            <div className="text-sm text-[var(--bento-text-muted)]">
              No organizations found.
            </div>
          ) : (
            organizationList.map((org) => (
              <Button
                key={org.id}
                variant={selectedId === org.id ? "default" : "outline"}
                onClick={() => setSelectedId(org.id)}
              >
                {org.name}
              </Button>
            ))
          )}
        </div>
      </BentoCard>

      <BentoCard>
        <BentoCardHeader title="Organization Settings" />
        <p className="settings-card-description mb-3">
          Update the display name and slug used across the platform.
        </p>
        {loadingActive ? (
          <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading organization
            details…
          </div>
        ) : activeError ? (
          <div className="text-sm text-destructive">
            {activeError instanceof Error
              ? activeError.message
              : "Unable to load organization details."}
          </div>
        ) : activeOrganization ? (
          <OrganizationDetailsForm
            organization={activeOrganization}
            onSubmit={updateOrganization.mutateAsync}
            submitting={updateOrganization.isPending}
          />
        ) : null}
      </BentoCard>

      <BentoCard>
        <BentoCardHeader title="Members" />
        <p className="settings-card-description mb-3">
          Review current members and their roles.
        </p>
        {loadingActive ? (
          <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
          </div>
        ) : memberList.length > 0 ? (
          <SettingsTableShell>
            <SettingsTable>
              <SettingsTableHeader>
                <SettingsTableHeaderRow>
                  <SettingsTableHead>Name</SettingsTableHead>
                  <SettingsTableHead>Email</SettingsTableHead>
                  <SettingsTableHead>Role</SettingsTableHead>
                  <SettingsTableHead>Joined</SettingsTableHead>
                </SettingsTableHeaderRow>
              </SettingsTableHeader>
              <SettingsTableBody>
                {memberList.map((member) => (
                  <SettingsTableRow key={member.id}>
                    <SettingsTableCell className="text-[var(--settings-foreground-strong)]">
                      {member.user?.name ?? `User ${member.userId}`}
                    </SettingsTableCell>
                    <SettingsTableCell>
                      {member.user?.email ?? "—"}
                    </SettingsTableCell>
                    <SettingsTableCell className="capitalize">
                      {member.role.toLowerCase()}
                    </SettingsTableCell>
                    <SettingsTableCell>
                      {member.createdAt
                        ? new Date(member.createdAt).toLocaleDateString()
                        : "—"}
                    </SettingsTableCell>
                  </SettingsTableRow>
                ))}
              </SettingsTableBody>
            </SettingsTable>
          </SettingsTableShell>
        ) : (
          <div className="text-sm text-[var(--bento-text-muted)]">
            No members found.
          </div>
        )}
      </BentoCard>
    </SettingsPage>
  );
}

function OrganizationDetailsForm({
  organization,
  submitting,
  onSubmit,
}: {
  organization: Organization;
  submitting: boolean;
  onSubmit: (payload: {
    organizationId: string;
    data: Record<string, UntypedJson>;
  }) => Promise<UntypedJson>;
}) {
  const [name, setName] = useState(organization.name ?? "");
  const [slug, setSlug] = useState(organization.slug ?? "");

  useEffect(() => {
    setName(organization.name ?? "");
    setSlug(organization.slug ?? "");
  }, [organization.id, organization.name, organization.slug]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          organizationId: organization.id,
          data: { name, slug },
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-slug">Slug</Label>
        <Input
          id="org-slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
