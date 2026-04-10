import { memo } from "react";
import type { ChatStatus } from "ai";

import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/components/dashboard/chat-types";
import { resolveModelKey } from "@/lib/ai/nex-models";
import { COMPOSER_FONT_CLASS } from "./composer-theme";
import { ComposerTaskStatus } from "./composer-task-status";
import { deriveComposerTaskState } from "./task-status-state";

interface UpgradeBannerProps {
  isActive?: boolean;
  messages?: ConversationMessage[];
  modelValue?: string;
  status?: ChatStatus;
  variant?: "default" | "instant-muted";
  size?: "default" | "compact";
}

function ComposerUpgradeBadge() {
  return (
    <span
      data-testid="upgrade-banner-icon"
      className={cn(
        COMPOSER_FONT_CLASS,
        "inline-flex size-6 items-center justify-center rounded-[7px] border border-[var(--auth-composer-badge-border)] bg-[var(--auth-composer-badge-bg)] text-[10px] font-medium leading-none text-[var(--auth-composer-badge-fg)]",
      )}
    >
      AI
    </span>
  );
}

export const UpgradeBanner = memo(function UpgradeBanner({
  isActive: _isActive = true,
  messages = [],
  modelValue,
  status = "ready",
  variant = "default",
  size: _size = "default",
}: UpgradeBannerProps) {
  const isUltra = resolveModelKey(modelValue) === "nex-t1-ultra";
  const usesPremiumModel = Boolean(modelValue) && !isUltra;
  const taskState = deriveComposerTaskState({
    chatStatus: status,
    messages,
  });
  const containerClassName = cn(
    COMPOSER_FONT_CLASS,
    "relative z-10 flex h-[var(--auth-composer-banner-height)] w-full items-center gap-[var(--auth-composer-banner-gap)] px-[var(--auth-composer-banner-padding-x)] py-[var(--auth-composer-banner-padding-y)]",
  );
  const textClassName =
    "text-[length:var(--auth-composer-banner-text-size)] font-medium leading-[var(--auth-composer-banner-line-height)]";

  if (taskState) {
    return (
      <div className={containerClassName}>
        <ComposerTaskStatus taskState={taskState} variant={variant} />
      </div>
    );
  }

  if (variant === "instant-muted") {
    return (
      <div className={containerClassName}>
        <div className="flex items-center gap-1">
          <ComposerUpgradeBadge />
          <span className={cn(textClassName, usesPremiumModel ? "text-[#0a0a0a] dark:text-[#ffffff]" : "text-[var(--auth-composer-muted)]")}>
            Access premium models &amp; features
          </span>
        </div>
        <span className={cn(textClassName, "text-[var(--auth-composer-muted)]")}>
          ∙
        </span>
        <button
          type="button"
          className={cn(textClassName, "text-[#3891ff] ring-0 ring-transparent transition-colors hover:text-[#3891ff]")}
        >
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-1">
        <ComposerUpgradeBadge />
        <span className={cn(textClassName, usesPremiumModel ? "text-[#0a0a0a] dark:text-[#ffffff]" : "text-[var(--auth-composer-muted)]")}>
          Access premium models &amp; features
        </span>
      </div>
      <span className={cn(textClassName, "text-[var(--auth-composer-muted)]")}>
        ∙
      </span>
      <button
        type="button"
        className={cn(textClassName, "text-[#3891ff] ring-0 ring-transparent transition-colors hover:text-[#3891ff]")}
      >
        Upgrade
      </button>
    </div>
  );
});
