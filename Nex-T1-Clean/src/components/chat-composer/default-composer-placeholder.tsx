"use client";

import { APP_CHAT_COMPOSER_PLACEHOLDER_PROMPTS } from "@/components/chat-composer/constants";
import { COMPOSER_PLACEHOLDER_TEXT_CLASS } from "@/components/chat-composer/composer-theme";
import { RotatingVanishPlaceholder } from "@/components/chat-composer/rotating-vanish-placeholder";
import { cn } from "@/lib/utils";

type DefaultComposerPlaceholderProps = {
  useNexInstantSurface: boolean;
};

export function DefaultComposerPlaceholder({
  useNexInstantSurface,
}: DefaultComposerPlaceholderProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        useNexInstantSurface
          ? "px-1 pt-[15px]"
          : "px-[var(--auth-composer-prompt-padding-x)] pb-[var(--auth-composer-editor-padding-bottom)] pt-[var(--auth-composer-editor-padding-top)]",
      )}
    >
      <RotatingVanishPlaceholder
        prompts={APP_CHAT_COMPOSER_PLACEHOLDER_PROMPTS}
        className={cn(
          "text-[length:var(--auth-composer-input-size)] leading-[var(--auth-composer-input-line-height)]",
          COMPOSER_PLACEHOLDER_TEXT_CLASS,
          useNexInstantSurface ? "pl-1" : "",
        )}
      />
    </div>
  );
}
