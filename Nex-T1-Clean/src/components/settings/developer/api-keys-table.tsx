"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { TrashIcon } from "@/components/sidebar-03/animated-icons";
import type {
  ApiKeyRecord,
  DeveloperProjectRecord,
} from "@/components/settings/developer/developer-api-data";
import { Button } from "@/components/settings/shared/settings-button";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableEmptyCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";

type ApiKeysTableProps = {
  apiKeys: ApiKeyRecord[];
  projects: DeveloperProjectRecord[];
  rotatePending: boolean;
  deletePending: boolean;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ApiKeysTable({
  apiKeys,
  projects,
  rotatePending,
  deletePending,
  onRotate,
  onDelete,
}: ApiKeysTableProps) {
  const projectNameById = new Map(
    projects.map((project) => [project.id, project.name]),
  );

  return (
    <SettingsTableShell>
      <SettingsTable>
        <SettingsTableHeader>
          <SettingsTableHeaderRow>
            <SettingsTableHead>Key</SettingsTableHead>
            <SettingsTableHead>Project</SettingsTableHead>
            <SettingsTableHead>Products</SettingsTableHead>
            <SettingsTableHead>Tier &amp; limits</SettingsTableHead>
            <SettingsTableHead>Last used</SettingsTableHead>
            <SettingsTableHead className="text-right">Actions</SettingsTableHead>
          </SettingsTableHeaderRow>
        </SettingsTableHeader>
        <SettingsTableBody>
          {apiKeys.length === 0 ? (
            <SettingsTableRow>
              <SettingsTableEmptyCell colSpan={6}>
                No API keys yet.
              </SettingsTableEmptyCell>
            </SettingsTableRow>
          ) : (
            apiKeys.map((key) => {
              const tierInMetadata =
                typeof key.metadata?.tier === "string"
                  ? (key.metadata.tier as string)
                  : null;
              const tier = key.tier ?? tierInMetadata ?? "free";
              const lastUsed = key.lastUsedAt
                ? formatDistanceToNow(new Date(key.lastUsedAt), {
                    addSuffix: true,
                  })
                : "Never";
              const rateLimitLabel =
                typeof key.rateLimit?.requestsPerMinute === "number" &&
                key.rateLimit.requestsPerMinute > 0
                  ? `${key.rateLimit.requestsPerMinute}/min`
                  : "—";
              const quotaLabel = [
                typeof key.quotas?.daily === "number" && key.quotas.daily > 0
                  ? `${key.quotas.daily}/day`
                  : null,
                typeof key.quotas?.monthly === "number" && key.quotas.monthly > 0
                  ? `${key.quotas.monthly}/month`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <SettingsTableRow key={key.id}>
                  <SettingsTableCell className="font-mono text-sm text-[var(--settings-foreground-strong)]">
                    <div>{key.start}••••••</div>
                    <div className="text-xs text-[var(--settings-foreground-muted)]">
                      {key.name || "Unlabeled key"}
                    </div>
                  </SettingsTableCell>
                  <SettingsTableCell>
                    <div className="text-sm text-[var(--settings-foreground-strong)]">
                      {key.projectId ? projectNameById.get(key.projectId) ?? "Unknown project" : "Unassigned"}
                    </div>
                    <div className="text-xs text-[var(--settings-foreground-muted)]">
                      {key.ownerType === "organization" ? "Organization" : "Personal"}
                    </div>
                  </SettingsTableCell>
                  <SettingsTableCell className="text-xs text-[var(--settings-foreground-muted)]">
                    {key.allowedProducts?.length
                      ? key.allowedProducts.join(", ")
                      : "All public products"}
                  </SettingsTableCell>
                  <SettingsTableCell>
                    <div className="text-sm capitalize text-[var(--settings-foreground-strong)]">
                      {tier}
                    </div>
                    <div className="text-xs text-[var(--settings-foreground-muted)]">
                      Rate: {rateLimitLabel}
                    </div>
                    <div className="text-xs text-[var(--settings-foreground-muted)]">
                      Quota: {quotaLabel || "—"}
                    </div>
                  </SettingsTableCell>
                  <SettingsTableCell>{lastUsed}</SettingsTableCell>
                  <SettingsTableCell className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:bg-white/5"
                      title="Rotate"
                      onClick={() => onRotate(key.id)}
                      disabled={rotatePending}
                    >
                      {rotatePending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:bg-white/5"
                      title="Revoke"
                      onClick={() => onDelete(key.id)}
                      disabled={deletePending}
                    >
                      {deletePending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </SettingsTableCell>
                </SettingsTableRow>
              );
            })
          )}
        </SettingsTableBody>
      </SettingsTable>
    </SettingsTableShell>
  );
}
