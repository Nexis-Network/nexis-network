"use client";

import { WebPreview, WebPreviewBody } from "@/components/ai-elements/web-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreateCapability, CreateProject, CreateTemplate } from "@/modules/create/types";
import { Code2, Database, ExternalLink, Eye, Globe2, LoaderCircle } from "lucide-react";

type CreatePreviewPanelProps = {
  capabilities: readonly CreateCapability[];
  project: CreateProject | null;
  streaming: boolean;
  templates: readonly CreateTemplate[];
};

function resolveTemplateLabel(
  project: CreateProject | null,
  templates: readonly CreateTemplate[],
): string {
  if (!project) {
    return "No active project";
  }

  return (
    templates.find((template) => template.id === project.templateId)?.label ??
    project.templateId
  );
}

export function CreatePreviewPanel({
  capabilities,
  project,
  streaming,
  templates,
}: CreatePreviewPanelProps) {
  const previewUrl = project?.previewUrl ?? "";
  const templateLabel = resolveTemplateLabel(project, templates);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--auth-app-bg)] text-white">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-white" variant="outline">
              Live preview
            </Badge>
            <Badge className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-white/70" variant="outline">
              {templateLabel}
            </Badge>
            {project ? (
              <Badge className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-white/60" variant="outline">
                {project.status}
              </Badge>
            ) : null}
          </div>

          {previewUrl ? (
            <Button asChild className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]" size="sm" variant="outline">
              <a href={previewUrl} rel="noreferrer" target="_blank">
                Open
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-white/45">
              <LoaderCircle className="size-3.5 animate-spin" />
              Waiting for deploy
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/[0.08] text-white">
              <Eye className="size-4" />
            </div>
            <div className="flex size-8 items-center justify-center rounded-full text-white/50">
              <Code2 className="size-4" />
            </div>
            <div className="flex size-8 items-center justify-center rounded-full text-white/50">
              <Database className="size-4" />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70">
            <Globe2 className="size-4 shrink-0 text-white/45" />
            <span className="truncate">
              {previewUrl || "Preview URL will appear after the first successful build"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-white/60" variant="outline">
            {project?.framework ?? "framework pending"}
          </Badge>
          <Badge className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-white/60" variant="outline">
            {project?.chainFamily ?? "chain pending"}
          </Badge>
          <Badge className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-white/60" variant="outline">
            {project ? `${project.snapshotFiles.length} files mirrored` : "No snapshot yet"}
          </Badge>
          {streaming ? (
            <Badge className="rounded-full border-[#0a84ff]/30 bg-[#0a84ff]/10 px-3 py-1 text-[#8ec5ff]" variant="outline">
              Streaming active
            </Badge>
          ) : null}
        </div>
      </div>

      {previewUrl ? (
        <WebPreview className="m-0 min-h-0 flex-1 rounded-none border-0 bg-transparent">
          <WebPreviewBody className="bg-black" src={previewUrl} />
        </WebPreview>
      ) : (
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />

          <div className="relative flex w-full flex-col justify-between px-6 py-6">
            <div className="max-w-xl space-y-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                Preview status
              </p>
              <h2 className="font-medium text-2xl">
                {project ? "Preview is being prepared." : "Start the first build to hydrate the preview."}
              </h2>
              <p className="text-sm leading-6 text-white/55">
                {project
                  ? "v0 has accepted the project and the live deployment will attach here as soon as the latest version is ready."
                  : "Your project chat, file snapshot, and deployment metadata stay mirrored together so you can resume generation without losing context."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {capabilities.map((capability) => (
                <Badge key={capability.id} className="rounded-full border-white/10 bg-white/[0.04] px-3 py-1 text-white/55" variant="outline">
                  {capability.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="absolute bottom-5 right-5 max-w-sm rounded-2xl border border-white/10 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_8px,rgba(255,255,255,0.02)_8px,rgba(255,255,255,0.02)_16px)] px-5 py-4 text-right shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)]">
            <p className="text-sm font-medium text-white/80">
              You can send messages while the preview loads.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
