"use client";

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  CreateCapability,
  CreateProject,
  CreateTemplate,
  CreateTemplateId,
} from "@/modules/create/types";
import { Sparkles, Zap } from "lucide-react";
import type { ReactNode } from "react";

type CreateConversationHeaderProps = {
  activeProject: CreateProject | null;
  activeTemplate: CreateTemplate | undefined;
  capabilities: readonly CreateCapability[];
  error: string | null;
  historyAction?: ReactNode;
  onStreamEnabledChange: (value: boolean) => void;
  onSubmit: (prompt: string) => void;
  onTemplateChange: (value: CreateTemplateId) => void;
  selectedTemplateId: CreateTemplateId;
  streamEnabled: boolean;
  templates: readonly CreateTemplate[];
};

export function CreateConversationHeader({
  activeProject,
  activeTemplate,
  capabilities,
  error,
  historyAction,
  onStreamEnabledChange,
  onSubmit,
  onTemplateChange,
  selectedTemplateId,
  streamEnabled,
  templates,
}: CreateConversationHeaderProps) {
  return (
    <div className="border-b border-[var(--auth-border-subtle)] px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-white/10 bg-[var(--auth-app-bg)] px-3 py-1 text-white" variant="outline">
              v0 Create
            </Badge>
            {activeProject ? (
              <Badge className="rounded-full border-[var(--auth-border-subtle)] px-3 py-1 text-[var(--auth-text-muted)]" variant="outline">
                {activeProject.status}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--auth-text-muted)]">
              Builder session
            </p>
            <p className="max-w-2xl text-sm leading-6 text-[var(--auth-text-secondary)]">
              Prompt a production-minded Web3 app, keep the full conversation in sync, and publish a live preview as soon as v0 finishes the first build.
            </p>
          </div>
        </div>
        {historyAction}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.24em] text-[var(--auth-text-muted)]">
              Template
            </span>
            <Select onValueChange={(value) => onTemplateChange(value as CreateTemplateId)} value={selectedTemplateId}>
              <SelectTrigger className="h-11 rounded-2xl border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="flex items-center gap-3 rounded-2xl border border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)] px-4 py-3">
            <Zap className="size-4 text-[var(--auth-text-muted)]" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--auth-text-muted)]">
                Streaming
              </p>
              <p className="text-sm text-[var(--auth-text-secondary)]">
                Show live v0 response deltas.
              </p>
            </div>
            <Switch
              checked={streamEnabled}
              className="ml-auto"
              onCheckedChange={onStreamEnabledChange}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {capabilities.map((capability) => (
            <Badge key={capability.id} className="rounded-full border-[var(--auth-border-subtle)] px-3 py-1 text-[var(--auth-text-muted)]" variant="outline">
              {capability.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[var(--auth-text-muted)]">
          <Sparkles className="size-3.5" />
          Starter prompts
        </div>
        <Suggestions>
          {activeTemplate?.starterPrompts.map((suggestion) => (
            <Suggestion
              key={suggestion}
              className="rounded-full border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)] text-[var(--auth-text-secondary)] hover:bg-[var(--auth-accent)] hover:text-[var(--auth-text-primary)]"
              onClick={onSubmit}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[color-mix(in_oklab,var(--auth-destructive)_35%,transparent)] bg-[color-mix(in_oklab,var(--auth-destructive)_12%,transparent)] px-4 py-3 text-sm text-[color-mix(in_oklab,var(--auth-destructive)_72%,var(--auth-text-primary)_28%)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
