"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSubscriptionTierLabel } from "@/lib/billing/subscription-tier";
import { cn } from "@/lib/utils";
import type { CreateProject, CreateTemplate, CreateViewer } from "@/modules/create/types";
import { Clock3, Plus, ShieldCheck } from "lucide-react";

type CreateHistoryListProps = {
  activeProjectId: string | null;
  claimableProjects: CreateProject[];
  loading: boolean;
  onClaim: (projectId: string) => void;
  onNewProject: () => void;
  onSelect: (projectId: string) => void;
  projects: CreateProject[];
  templates: readonly CreateTemplate[];
  viewer: CreateViewer;
};

function formatLastActivity(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getViewerCopy(viewer: CreateViewer): {
  badge: string;
  description: string;
} {
  if (viewer.kind === "user") {
    return {
      badge: getSubscriptionTierLabel(viewer.plan),
      description: "Private projects synced to your active workspace.",
    };
  }

  if (viewer.kind === "guest") {
    return {
      badge: "Guest",
      description: "Guest sessions keep one active project for 24 hours.",
    };
  }

  return {
    badge: "Public",
    description: "Your first prompt creates a signed guest session automatically.",
  };
}

function resolveTemplateLabel(
  project: CreateProject,
  templates: readonly CreateTemplate[],
): string {
  return templates.find((template) => template.id === project.templateId)?.label ?? project.templateId;
}

type ProjectRowProps = {
  active: boolean;
  onSelect?: () => void;
  project: CreateProject;
  templates: readonly CreateTemplate[];
  trailingAction?: ReactNode;
};

function ProjectRow({
  active,
  onSelect,
  project,
  templates,
  trailingAction,
}: ProjectRowProps) {
  return (
    <button
      className={cn(
        "w-full rounded-2xl border px-3 py-3 text-left transition-all",
        active
          ? "border-[#0a84ff] bg-white/[0.04] shadow-[0_0_0_1px_rgba(10,132,255,0.18)]"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-sm text-white">
            {resolveTemplateLabel(project, templates)}
          </p>
          <p className="truncate text-[11px] text-white/55">
            {project.framework} on {project.chainFamily}
          </p>
        </div>
        {trailingAction ?? (
          <Badge className="shrink-0 rounded-full border-white/10 bg-white/[0.04] text-[10px] text-white/65" variant="outline">
            {project.status}
          </Badge>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-white/45">
        <Clock3 className="size-3.5" />
        <span className="truncate">{formatLastActivity(project.lastActivityAt)}</span>
      </div>
    </button>
  );
}

export function CreateHistoryList({
  activeProjectId,
  claimableProjects,
  loading,
  onClaim,
  onNewProject,
  onSelect,
  projects,
  templates,
  viewer,
}: CreateHistoryListProps) {
  const viewerCopy = getViewerCopy(viewer);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-white/8 bg-[var(--auth-app-bg)] text-white">
      <div className="space-y-4 border-b border-white/8 px-4 py-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/55">
                Sessions
              </p>
              <Badge className="rounded-full border-white/10 bg-white/[0.04] text-[10px] text-white/65" variant="outline">
                {viewerCopy.badge}
              </Badge>
            </div>
            <p className="text-xs leading-5 text-white/45">
              {viewerCopy.description}
            </p>
          </div>

          <Button
            className="h-10 w-full justify-start rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            onClick={onNewProject}
            type="button"
            variant="outline"
          >
            <Plus className="size-4" />
            New project
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 px-4 py-4">
          {claimableProjects.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/45">
                <ShieldCheck className="size-3.5" />
                Claimable
              </div>
              <div className="space-y-3">
                {claimableProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    active={project.id === activeProjectId}
                    project={project}
                    templates={templates}
                    trailingAction={
                      <Button
                        className="h-8 rounded-full border-white/10 bg-white text-black hover:bg-white/90"
                        onClick={(event) => {
                          event.stopPropagation();
                          onClaim(project.id);
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Claim
                      </Button>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
              Active projects
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm text-white/45">
                Loading your create workspace...
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    active={project.id === activeProjectId}
                    onSelect={() => onSelect(project.id)}
                    project={project}
                    templates={templates}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-sm leading-6 text-white/45">
                No projects yet. Pick a template and describe the dApp you want to generate.
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
