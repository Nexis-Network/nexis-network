"use client";

import { memo } from "react";
import { IconArrowUp } from "@tabler/icons-react";

import type { ChatStatus } from "ai";

import {
  COMPOSER_ICON_CLASS,
  getComposerControlButtonClassName,
} from "@/components/chat-composer/composer-theme";
import { cn } from "@/lib/utils";

type SendButtonProps = {
  disabled?: boolean;
  status: ChatStatus;
  onClick: () => void;
  className?: string;
};

function SendButtonComponent({
  disabled,
  status,
  onClick,
  className,
}: SendButtonProps) {
  const isSending = status === "submitted" || status === "streaming";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        getComposerControlButtonClassName(),
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
        !className && "absolute right-3 top-2",
        className,
      )}
      aria-label={isSending ? "Sending" : "Send"}
    >
      {isSending ? (
        <div className={cn(COMPOSER_ICON_CLASS, "rounded-[3px] bg-current")} />
      ) : (
        <IconArrowUp className={COMPOSER_ICON_CLASS} />
      )}
    </button>
  );
}

export const SendButton = memo(SendButtonComponent);
