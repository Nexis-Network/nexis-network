"use client";

import { Settings2, Sparkles } from "lucide-react";

import { ComposerPreferencesMenu } from "@/components/chat-composer/composer-preferences-menu";
import { ModelSelector } from "@/components/chat-composer/model-selector";
import { cn } from "@/lib/utils";

import type { CompactComposerSurfaceProps } from "./compact-composer-surface.types";

type CompactComposerFooterBarProps = Pick<
  CompactComposerSurfaceProps,
  | "composerStyle"
  | "composerMaxWidthClass"
  | "composerWidthClass"
  | "contextUsage"
  | "executionPreferences"
  | "onComposerStyleChange"
  | "onExecutionPreferencesChange"
  | "onModelSelect"
  | "options"
  | "selectedModel"
  | "voiceUi"
>;

export function CompactComposerFooterBar({
  composerStyle,
  composerMaxWidthClass,
  composerWidthClass,
  contextUsage,
  executionPreferences,
  onComposerStyleChange,
  onExecutionPreferencesChange,
  onModelSelect,
  options,
  selectedModel,
  voiceUi,
}: CompactComposerFooterBarProps) {
  const controlTriggerClassName =
    "border-transparent bg-transparent px-0 text-[var(--auth-composer-muted,var(--muted-foreground))] hover:bg-transparent hover:text-[var(--auth-composer-muted,var(--muted-foreground))] dark:hover:bg-transparent";
  const controlLabelClassName =
    "font-funnel text-xs font-medium text-[var(--auth-composer-muted,var(--muted-foreground))]";
  const controlIconClassName =
    "size-3.5 text-[var(--auth-composer-muted,var(--muted-foreground))]";

  return (
    <div
      className={cn(
        "pointer-events-none w-full max-w-full px-1",
        composerWidthClass,
        composerMaxWidthClass,
      )}
    >
      <div className="flex min-h-6 items-center justify-between gap-2">
        <div className="pointer-events-auto flex min-h-6 min-w-0 flex-nowrap items-center gap-3 justify-self-start">
          <ModelSelector
            value={selectedModel.value}
            options={options}
            onSelect={onModelSelect}
            useGlassTrigger={false}
            triggerClassName={controlTriggerClassName}
            labelClassName={controlLabelClassName}
            leadingIcon={<Sparkles className={controlIconClassName} />}
          />

          <ComposerPreferencesMenu
            executionPreferences={executionPreferences}
            onExecutionPreferencesChange={onExecutionPreferencesChange}
            composerStyle={composerStyle}
            onComposerStyleChange={onComposerStyleChange ?? (() => undefined)}
            triggerVariant="text"
            triggerLabel="Preferences"
            triggerClassName={controlTriggerClassName}
            labelClassName={controlLabelClassName}
            triggerIcon={<Settings2 className={controlIconClassName} />}
          />
        </div>

        <div className="pointer-events-auto flex min-h-6 min-w-0 items-center justify-self-end gap-2 text-[10px] text-muted-foreground">
          {contextUsage?.usedTokens ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              {Math.round(contextUsage.usedTokens / 1000)}k/
              {Math.round(contextUsage.maxTokens / 1000)}k
            </span>
          ) : null}
          {voiceUi?.badge}
        </div>
      </div>
    </div>
  );
}
