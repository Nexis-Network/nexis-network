"use client";

import { AttachmentsList } from "@/components/chat-composer/attachments-list";
import { IntentInsightsPanel } from "@/components/chat-composer/intent-insights-panel";
import { cn } from "@/lib/utils";

import type { CompactComposerSurfaceProps } from "./compact-composer-surface.types";

type CompactComposerSupportingContentProps = Pick<
  CompactComposerSurfaceProps,
  | "attachments"
  | "composerMaxWidthClass"
  | "composerWidthClass"
  | "intentInsights"
  | "onPromptClick"
  | "onRemoveAttachment"
  | "showIntentInsights"
  | "voiceUi"
>;

export function CompactComposerSupportingContent({
  attachments,
  composerMaxWidthClass,
  composerWidthClass,
  intentInsights,
  onPromptClick,
  onRemoveAttachment,
  showIntentInsights,
  voiceUi,
}: CompactComposerSupportingContentProps) {
  return (
    <>
      {showIntentInsights ? (
        <div
          className={cn(
            "w-full max-w-full overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] px-2 py-2",
            composerWidthClass,
            composerMaxWidthClass,
          )}
        >
          <IntentInsightsPanel
            insights={intentInsights}
            onHintSelect={onPromptClick}
          />
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div
          className={cn(
            "w-full max-w-full overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025]",
            composerWidthClass,
            composerMaxWidthClass,
          )}
        >
          <AttachmentsList attachments={attachments} onRemove={onRemoveAttachment} />
        </div>
      ) : null}

      {voiceUi?.voiceError ? (
        <p className="px-3 pb-2 text-xs text-destructive">
          {voiceUi.voiceError}
        </p>
      ) : null}
    </>
  );
}
