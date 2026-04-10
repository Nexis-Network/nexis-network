"use client";

import { Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import type {
  DeveloperProjectRecord,
  OrganizationSummary,
} from "@/components/settings/developer/developer-api-data";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiProjectFormProps = {
  organizations: OrganizationSummary[];
  onCreated: (project: DeveloperProjectRecord) => void;
};

function parseOptionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ApiProjectForm({
  organizations,
  onCreated,
}: ApiProjectFormProps) {
  const [ownerType, setOwnerType] = useState<"user" | "organization">("user");
  const hasOrganizations = organizations.length > 0;

  const createProject = useMutation({
    mutationFn: async (formData: FormData) => {
      const nextOwnerType =
        formData.get("ownerType") === "organization"
          ? "organization"
          : "user";
      const organizationId = String(formData.get("organizationId") ?? "").trim();

      if (nextOwnerType === "organization" && organizationId.length === 0) {
        throw new Error("Select an organization for this developer project.");
      }

      const response = await fetch("/api/auth/api-project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: String(formData.get("name") ?? "").trim(),
          description: String(formData.get("description") ?? "").trim() || undefined,
          ownerType: nextOwnerType,
          organizationId: nextOwnerType === "organization" ? organizationId : undefined,
          hardCapUsd: parseOptionalNumber(formData.get("hardCapUsd")),
          softCapUsd: parseOptionalNumber(formData.get("softCapUsd")),
          overageEnabled: formData.get("overageEnabled") === "on",
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error?.message ?? "Failed to create developer project.");
      }

      return payload.data as DeveloperProjectRecord;
    },
    onSuccess: (project) => {
      toast.success("Developer project created.");
      onCreated(project);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create developer project.",
      );
    },
  });

  return (
    <form
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr),minmax(0,140px),minmax(0,140px),auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        createProject.mutate(formData, {
          onSuccess: () => form.reset(),
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="projectName" className="text-xs">
          Project name
        </Label>
        <Input
          id="projectName"
          name="name"
          placeholder="Production API"
          className="text-xs"
          disabled={createProject.isPending}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="projectDescription" className="text-xs">
          Description
        </Label>
        <Input
          id="projectDescription"
          name="description"
          placeholder="Billing and request logs for the main app"
          className="text-xs"
          disabled={createProject.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="projectOwnerType" className="text-xs">
          Scope
        </Label>
        <select
          id="projectOwnerType"
          name="ownerType"
          value={ownerType}
          disabled={createProject.isPending}
          onChange={(event) => {
            setOwnerType(
              event.target.value === "organization" ? "organization" : "user",
            );
          }}
          className="h-10 w-full rounded-md border border-[var(--bento-border)] bg-white/[0.03] px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
        >
          <option value="user">Personal</option>
          <option value="organization" disabled={!hasOrganizations}>
            Organization
          </option>
        </select>
        {ownerType === "organization" ? (
          <select
            name="organizationId"
            defaultValue={organizations[0]?.id ?? ""}
            disabled={!hasOrganizations || createProject.isPending}
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
        <Label htmlFor="projectSoftCapUsd" className="text-xs">
          Soft cap (USD)
        </Label>
        <Input
          id="projectSoftCapUsd"
          name="softCapUsd"
          type="number"
          min="0"
          step="0.01"
          placeholder="250"
          className="text-xs"
          disabled={createProject.isPending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="projectHardCapUsd" className="text-xs">
          Hard cap (USD)
        </Label>
        <Input
          id="projectHardCapUsd"
          name="hardCapUsd"
          type="number"
          min="0"
          step="0.01"
          placeholder="500"
          className="text-xs"
          disabled={createProject.isPending}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--settings-foreground-muted)] lg:col-span-4">
        <input
          type="checkbox"
          name="overageEnabled"
          defaultChecked
          disabled={createProject.isPending}
          className="h-4 w-4 rounded border-[var(--bento-border)] bg-transparent"
        />
        Allow overage usage until the hard cap is reached
      </label>
      <div className="flex items-end justify-end lg:col-span-1">
        <Button
          type="submit"
          className="settings-primary-button h-8 rounded-[10px] px-3 text-xs"
          disabled={createProject.isPending}
        >
          {createProject.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Create project
        </Button>
      </div>
    </form>
  );
}
