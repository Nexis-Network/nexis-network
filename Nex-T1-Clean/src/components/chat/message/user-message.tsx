"use client";

/**
 * User Message Component
 * Renders user messages with proper styling and action buttons
 * Extracted for maintainability and testing
 */

import { memo, useState } from "react";
import { Message, MessageAvatar } from "@/components/dashboard/lazy-components";
import { renderTextWithTokenMentions } from "@/components/ai-elements/token-mention";
import { createKeyGenerator } from "@/components/dashboard/markdown";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/components/chat/types";
import { Action, Actions } from "@/components/ui/shadcn-io/ai/actions";
import { CopyIcon, EditIcon, CheckIcon } from "lucide-react";
import {
  CHAT_THREAD_MESSAGE_ROW_CLASSNAME,
  CHAT_THREAD_USER_BUBBLE_CLASSNAME,
} from "./thread-layout";

type UserMessageProps = {
  message: ConversationMessage;
  onEdit?: (message: ConversationMessage) => void;
};

export const UserMessage = memo(function UserMessage({
  message,
  onEdit,
}: UserMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const userText = message.content ?? "";
  const userMessageNodes = userText
    ? renderTextWithTokenMentions(
        userText,
        createKeyGenerator(`${message.id}-user-fragment`),
      )
    : null;
  const isMultiline = userText.includes("\n");

  const handleCopy = () => {
    if (!userText) return;
    navigator.clipboard.writeText(userText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    onEdit?.(message);
  };

  return (
    <Message
      from="user"
      key={message.id}
      className={CHAT_THREAD_MESSAGE_ROW_CLASSNAME}
    >
      <MessageAvatar role="user" />
      <div className="flex min-w-0 max-w-full grow flex-col">
        <div
          data-message-author-role="user"
          dir="auto"
          className="min-h-8 text-message relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal [.text-message+&]:mt-1"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex w-full flex-col gap-1 empty:hidden items-end rtl:items-start">
            <div
              className={cn(
                CHAT_THREAD_USER_BUBBLE_CLASSNAME,
                isMultiline && "py-3",
              )}
              data-multiline={isMultiline ? "true" : undefined}
            >
              <div className="whitespace-pre-wrap break-words text-sm leading-6 text-primary-foreground dark:text-[#F0F0F0] [overflow-wrap:anywhere]">
                {userMessageNodes}
              </div>
            </div>

            {/* Action buttons stay visible on touch, hover-revealed on larger screens. */}
            <div
              className={cn(
                "transition-opacity duration-150",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                isHovered ? "md:opacity-100" : "",
              )}
            >
              <Actions className="flex-wrap">
                <div className="flex items-center gap-1">
                  <Action
                    tooltip={copied ? "Copied!" : "Copy"}
                    onClick={handleCopy}
                    variant={copied ? "secondary" : "ghost"}
                  >
                    {copied ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                  </Action>
                  <Action
                    tooltip="Edit message"
                    onClick={handleEdit}
                    disabled={!onEdit}
                  >
                    <EditIcon className="size-3.5" />
                  </Action>
                </div>
              </Actions>
            </div>
          </div>
        </div>
      </div>
    </Message>
  );
});
