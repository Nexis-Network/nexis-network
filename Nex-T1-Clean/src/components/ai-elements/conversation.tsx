"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useCallback } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex h-full min-h-0 flex-1 overflow-hidden", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export const ConversationContent = forwardRef<
  HTMLDivElement,
  ConversationContentProps
>(({ className, children, ...props }, forwardedRef) => {
  const context = useStickToBottomContext();

  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      context.contentRef(node);

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [context, forwardedRef],
  );

  const setScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      context.scrollRef(node);
    },
    [context],
  );

  return (
    <div
      ref={setScrollRef}
      className="flex h-full min-h-0 flex-col overflow-y-auto no-scrollbar"
    >
      <div
        {...props}
        ref={setContentRef}
        className={cn("p-4", className)}
      >
        {typeof children === "function" ? children(context) : children}
      </div>
    </div>
  );
});

ConversationContent.displayName = "ConversationContent";

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
          className
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};

export default Conversation;

type ConversationAutoScrollProps = {
  trigger: UntypedJson;
  active?: boolean;
};

export const ConversationAutoScroll = ({ trigger, active = true }: ConversationAutoScrollProps) => {
  const { scrollToBottom, escapedFromLock } = useStickToBottomContext();
  const previousTrigger = useRef(trigger);

  useEffect(() => {
    if (!active) {
      previousTrigger.current = trigger;
      return;
    }

    if (escapedFromLock) {
      previousTrigger.current = trigger;
      return;
    }

    if (previousTrigger.current !== trigger) {
      previousTrigger.current = trigger;
      void scrollToBottom({ animation: "smooth" });
    }
  }, [active, escapedFromLock, scrollToBottom, trigger]);

  return null;
};
