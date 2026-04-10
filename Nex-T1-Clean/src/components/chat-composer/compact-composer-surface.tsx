"use client";

import { CompactComposerCard } from "@/components/chat-composer/compact-composer-card";
import { CompactComposerSupportingContent } from "@/components/chat-composer/compact-composer-supporting-content";

import type { CompactComposerSurfaceProps } from "./compact-composer-surface.types";

export function CompactComposerSurface(props: CompactComposerSurfaceProps) {
  const {
    attachments,
    composerMaxWidthClass,
    composerWidthClass,
    intentInsights,
    onFormSubmit,
    onPromptClick,
    onRemoveAttachment,
    showIntentInsights,
    voiceUi,
  } = props;

  return (
    <form
      onSubmit={onFormSubmit}
      className="group/composer flex w-full flex-col items-center gap-2.5"
    >
      <CompactComposerCard {...props} />
      <CompactComposerSupportingContent
        attachments={attachments}
        composerMaxWidthClass={composerMaxWidthClass}
        composerWidthClass={composerWidthClass}
        intentInsights={intentInsights}
        onPromptClick={onPromptClick}
        onRemoveAttachment={onRemoveAttachment}
        showIntentInsights={showIntentInsights}
        voiceUi={voiceUi}
      />
    </form>
  );
}
