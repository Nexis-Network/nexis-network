"use client";

import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  ApiKeyCreateResponse,
  ApiKeyRecord,
  DeveloperApiProduct,
  DeveloperProjectRecord,
  OrganizationSummary,
} from "@/components/settings/developer/developer-api-data";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiKeyCreateFormProps = {
  organizations: OrganizationSummary[];
  products: DeveloperApiProduct[];
  projects: DeveloperProjectRecord[];
  onCreated: (result: ApiKeyCreateResponse | ApiKeyRecord) => void;
};

function resolveOwnerProjects(
  projects: DeveloperProjectRecord[],
  ownerType: "user" | "organization",
  organizationId: string,
): DeveloperProjectRecord[] {
  return projects.filter((project) => {
    if (project.ownerType !== ownerType) {
      return false;
    }

    if (ownerType === "organization") {
      return project.ownerId === organizationId;
    }

    return true;
  });
}

export function ApiKeyCreateForm({
  organizations,
  products,
  projects,
  onCreated,
}: ApiKeyCreateFormProps) {
  const [ownerType, setOwnerType] = useState<"user" | "organization">("user");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [freshSecret, setFreshSecret] = useState<ApiKeyCreateResponse | null>(null);

  const scopedProjects = useMemo(
    () => resolveOwnerProjects(projects, ownerType, selectedOrganizationId),
    [ownerType, projects, selectedOrganizationId],
  );

  useEffect(() => {
    if (scopedProjects.some((project) => project.id === selectedProjectId)) {
      return;
    }

    setSelectedProjectId(scopedProjects[0]?.id ?? "");
  }, [scopedProjects, selectedProjectId]);

  const selectedProject =
    scopedProjects.find((project) => project.id === selectedProjectId) ?? null;

  const createKey = useMutation({
    mutationFn: async (formData: FormData) => {
      const allowedProducts = formData
        .getAll("allowedProducts")
        .filter((entry): entry is string => typeof entry === "string");
      if (allowedProducts.length === 0) {
        throw new Error("Select at least one public API product.");
      }

      const projectId = String(formData.get("projectId") ?? "").trim();
      if (projectId.length === 0) {
        throw new Error("Select a developer project before creating a key.");
      }

      const expiresInDays = String(formData.get("expiresIn") ?? "").trim();
      const expiresInSeconds =
        expiresInDays.length > 0 && Number.isFinite(Number(expiresInDays))
          ? Number(expiresInDays) * 24 * 60 * 60
          : undefined;
      const response = await fetch("/api/auth/api-key/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim() || undefined,
          ownerType,
          organizationId:
            ownerType === "organization" ? selectedOrganizationId : undefined,
          projectId,
          allowedProducts,
          expiresIn: expiresInSeconds,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error?.message ?? "Failed to create API key.");
      }

      return payload.data as ApiKeyCreateResponse;
    },
    onSuccess: (result) => {
      setFreshSecret(result);
      toast.success("API key created. Copy the secret now.");
      onCreated(result);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create API key.");
    },
  });

  return (
    <div className="space-y-4">
      <form
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr),minmax(0,1fr),160px]"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          createKey.mutate(formData, {
            onSuccess: () => form.reset(),
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="apiKeyLabel" className="text-xs">
            Label
          </Label>
          <Input
            id="apiKeyLabel"
            name="name"
            placeholder="Production integration"
            className="text-xs"
            disabled={createKey.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apiKeyScope" className="text-xs">
            Scope
          </Label>
          <select
            id="apiKeyScope"
            value={ownerType}
            disabled={createKey.isPending}
            onChange={(event) => {
              setOwnerType(
                event.target.value === "organization" ? "organization" : "user",
              );
            }}
            className="h-10 w-full rounded-md border border-[var(--bento-border)] bg-white/[0.03] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="user">Personal</option>
            <option value="organization" disabled={organizations.length === 0}>
              Organization
            </option>
          </select>
          {ownerType === "organization" ? (
            <select
              value={selectedOrganizationId}
              disabled={createKey.isPending}
              onChange={(event) => {
                setSelectedOrganizationId(event.target.value);
              }}
              className="h-10 w-full rounded-md border border-[var(--bento-border)] bg-white/[0.03] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="">Select organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apiKeyProject" className="text-xs">
            Project
          </Label>
          <select
            id="apiKeyProject"
            name="projectId"
            value={selectedProjectId}
            disabled={createKey.isPending || scopedProjects.length === 0}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="h-10 w-full rounded-md border border-[var(--bento-border)] bg-white/[0.03] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="">Select project</option>
            {scopedProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--settings-foreground-muted)]">
            {selectedProject
              ? `Soft cap: $${selectedProject.softCapUsd ?? 0} · Hard cap: $${selectedProject.hardCapUsd ?? 0}`
              : "Create a developer project first to enable public API traffic."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apiKeyExpiresIn" className="text-xs">
            Expiry (days)
          </Label>
          <Input
            id="apiKeyExpiresIn"
            name="expiresIn"
            type="number"
            min="1"
            placeholder="90"
            className="text-xs"
            disabled={createKey.isPending}
          />
        </div>

        <div className="space-y-2 xl:col-span-3">
          <p className="text-xs font-medium text-[var(--settings-foreground-strong)]">
            Allowed products
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {products.map((product) => (
              <label
                key={product.id}
                className="rounded-2xl border border-[var(--bento-border)] bg-white/[0.02] p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="allowedProducts"
                    value={product.id}
                    defaultChecked
                    disabled={createKey.isPending}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--bento-border)] bg-transparent"
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-[var(--settings-foreground-strong)]">
                      {product.label}
                    </p>
                    <p className="text-xs text-[var(--settings-foreground-muted)]">
                      {product.summary}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-end xl:col-span-1">
          <Button
            type="submit"
            className="settings-primary-button h-8 rounded-[10px] px-3 text-xs"
            disabled={createKey.isPending || scopedProjects.length === 0}
          >
            {createKey.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Generate key
          </Button>
        </div>
      </form>

      {freshSecret ? (
        <div className="settings-inline-section space-y-2">
          <p className="settings-section-label">Copy your new key</p>
          <p className="break-all font-mono text-xs text-[var(--bento-text-muted)]">
            {freshSecret.key}
          </p>
        </div>
      ) : null}
    </div>
  );
}
