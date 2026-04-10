"use client";

import {
  IconMicrophone,
  IconSend,
  IconWaveSine,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  COMPOSER_ICON_BUTTON_CLASS,
  COMPOSER_ICON_CLASS,
} from "@/components/chat-composer/composer-theme";
import { cn } from "@/lib/utils";

import type { CompactComposerSurfaceProps } from "./compact-composer-surface.types";

type CompactComposerTrailingControlsProps = {
  hasInput: boolean;
  isBusy: boolean;
  isSending: boolean;
  voiceUi?: CompactComposerSurfaceProps["voiceUi"];
};

export function CompactComposerTrailingControls({
  hasInput,
  isBusy,
  isSending,
  voiceUi,
}: CompactComposerTrailingControlsProps) {
  return (
    <div className="ms-auto flex items-center gap-1.5">
      {voiceUi?.muteButton ?? (
        <button
          type="button"
          className={COMPOSER_ICON_BUTTON_CLASS}
          aria-label="Record audio message"
        >
          <IconMicrophone className={COMPOSER_ICON_CLASS} />
        </button>
      )}

      {voiceUi?.toggleButton ?? (
        <button
          type="button"
          className={COMPOSER_ICON_BUTTON_CLASS}
          aria-label="Audio visualization"
        >
          <IconWaveSine className={COMPOSER_ICON_CLASS} />
        </button>
      )}

      {hasInput ? (
        <Button
          type="submit"
          size="icon"
          className="rounded-full shadow-none outline-none ring-0 ring-transparent focus:outline-none focus-visible:ring-0 focus-visible:ring-transparent"
          aria-label="Send message"
          disabled={isBusy}
        >
          {isSending ? (
            <div className={cn(COMPOSER_ICON_CLASS, "rounded-[3px] bg-current")} />
          ) : (
            <IconSend className={COMPOSER_ICON_CLASS} />
          )}
        </Button>
      ) : null}
    </div>
  );
}
