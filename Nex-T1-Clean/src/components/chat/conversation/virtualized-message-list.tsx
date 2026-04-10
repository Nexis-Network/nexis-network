"use client";

/**
 * Virtualized Message List
 * Renders only visible messages for 10,000+ message support
 */

import {
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ConversationMessage } from "@/components/chat/types";

type VirtualizedMessageListProps = {
  messages: ConversationMessage[];
  renderMessage: (message: ConversationMessage, index: number) => ReactNode;
  className?: string;
  autoScroll?: boolean;
  autoScrollTrigger?: string;
};

export function VirtualizedMessageList({
  messages,
  renderMessage,
  className,
  autoScroll = true,
  autoScrollTrigger = "",
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldFollowOutputRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);

  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => 100, []); // Lower estimate to cover small text messages
  const isNearBottom = useCallback((el: HTMLDivElement) => {
    const { scrollTop, clientHeight, scrollHeight } = el;
    return scrollTop + clientHeight >= scrollHeight - 120;
  }, []);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement,
    estimateSize,
    overscan: 5,
    useFlushSync: false,
  });

  const scheduleScrollToBottom = useCallback(() => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, {
          align: "end",
        });
        scrollFrameRef.current = null;
      });
    });
  }, [messages.length, virtualizer]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      shouldFollowOutputRef.current = isNearBottom(el);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  // Auto-scroll while streaming/new content arrives, unless the user scrolled away.
  useEffect(() => {
    if (!autoScroll || messages.length === 0) {
      return;
    }

    const el = parentRef.current;
    if (!el) {
      return;
    }

    const canFollow =
      shouldFollowOutputRef.current || isNearBottom(el);
    if (!canFollow) {
      return;
    }

    shouldFollowOutputRef.current = true;
    scheduleScrollToBottom();
  }, [autoScroll, autoScrollTrigger, isNearBottom, messages.length, scheduleScrollToBottom]);

  return (
    <div ref={parentRef} className={className} style={{ overflow: "auto" }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderMessage(message, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
