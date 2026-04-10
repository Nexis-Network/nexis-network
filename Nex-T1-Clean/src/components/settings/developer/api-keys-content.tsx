"use client";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiKeyCreateForm } from "@/components/settings/developer/api-key-create-form";
import { ApiKeysTable } from "@/components/settings/developer/api-keys-table";
import { ApiProjectForm } from "@/components/settings/developer/api-project-form";
import {
  fetchApiKeys,
  fetchDeveloperProjects,
  fetchOrganizations,
  fetchPublicDeveloperModels,
  type ApiKeyCreateResponse,
  type DeveloperProjectRecord,
} from "@/components/settings/developer/developer-api-data";
import { BentoCard } from "@/components/settings/shared/bento-card";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";

async function rotateApiKey(id: string): Promise<ApiKeyCreateResponse> {
  const response = await fetch("/api/auth/api-key/rotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success || !payload?.data) {
    throw new Error(payload?.error?.message ?? "Failed to rotate API key.");
  }

  return payload.data as ApiKeyCreateResponse;
}

async function revokeApiKey(id: string): Promise<void> {
  const response = await fetch("/api/auth/api-key/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "Failed to revoke API key.");
  }
}

function ProjectSummaryList({ projects }: { projects: DeveloperProjectRecord[] }) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-[var(--settings-foreground-muted)]">
        No developer projects yet. Create one to assign spend caps and public API keys.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <div
          key={project.id}
          className="rounded-2xl border border-[var(--bento-border)] bg-white/[0.02] p-4"
        >
          <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
            {project.name}
          </p>
          <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
            {project.ownerType === "organization" ? "Organization" : "Personal"} project
          </p>
          <p className="mt-3 text-xs text-[var(--settings-foreground-muted)]">
            Soft cap: ${project.softCapUsd ?? 0} · Hard cap: ${project.hardCapUsd ?? 0}
          </p>
          <p className="text-xs text-[var(--settings-foreground-muted)]">
            Overage: {project.overageEnabled ? "enabled" : "disabled"}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ApiKeysContent() {
  const apiKeysQuery = useQuery({
    queryKey: ["developer-api-keys"],
    queryFn: fetchApiKeys,
  });
  const organizationsQuery = useQuery({
    queryKey: ["developer-organizations"],
    queryFn: fetchOrganizations,
    staleTime: 60_000,
  });
  const projectsQuery = useQuery({
    queryKey: ["developer-projects"],
    queryFn: fetchDeveloperProjects,
  });
  const modelsQuery = useQuery({
    queryKey: ["developer-public-models"],
    queryFn: fetchPublicDeveloperModels,
    staleTime: 60_000,
  });

  const rotateKey = useMutation({
    mutationFn: rotateApiKey,
    onSuccess: () => {
      toast.success("API key rotated.");
      void apiKeysQuery.refetch();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to rotate API key.");
    },
  });
  const deleteKey = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      toast.success("API key revoked.");
      void apiKeysQuery.refetch();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to revoke API key.");
    },
  });

  const apiKeys = apiKeysQuery.data ?? [];
  const organizations = organizationsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const products = modelsQuery.data?.data ?? [];

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="API Keys"
        description="Create project-scoped public API keys, attach spend caps, and control which Nex products each key can access."
      />

      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="settings-card-title">Developer projects</h3>
            <p className="settings-card-description">
              Projects own spend caps, billing context, and request logs for public API traffic.
            </p>
          </div>
          <ApiProjectForm
            organizations={organizations}
            onCreated={() => {
              void projectsQuery.refetch();
            }}
          />
          <ProjectSummaryList projects={projects} />
        </div>
      </BentoCard>

      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="settings-card-title">Create a public API key</h3>
            <p className="settings-card-description">
              Generated secrets are shown once. Assign a project and product allowlist before shipping integrations.
            </p>
          </div>
          <ApiKeyCreateForm
            organizations={organizations}
            products={products}
            projects={projects}
            onCreated={() => {
              void apiKeysQuery.refetch();
            }}
          />
        </div>
      </BentoCard>

      <BentoCard>
        <div className="space-y-4">
          <div>
            <h3 className="settings-card-title">Existing keys</h3>
            <p className="settings-card-description">
              Rotate or revoke keys that are no longer attached to active deployments.
            </p>
          </div>

          {apiKeysQuery.isLoading || projectsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--bento-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading API keys...
            </div>
          ) : apiKeysQuery.error ? (
            <div className="text-sm text-destructive">
              {apiKeysQuery.error instanceof Error
                ? apiKeysQuery.error.message
                : "Failed to load API keys."}
            </div>
          ) : (
            <ApiKeysTable
              apiKeys={apiKeys}
              projects={projects}
              rotatePending={rotateKey.isPending}
              deletePending={deleteKey.isPending}
              onRotate={(id) => rotateKey.mutate(id)}
              onDelete={(id) => deleteKey.mutate(id)}
            />
          )}
        </div>
      </BentoCard>
    </SettingsPage>
  );
}
