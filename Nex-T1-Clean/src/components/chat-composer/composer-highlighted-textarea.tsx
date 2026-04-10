"use client";

import {
  forwardRef,
  Fragment,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { TokenIcon } from "@/components/ai-elements/token-mention";
import {
  buildCoinMentionMarkup,
  extractCoinGeckoMentions,
} from "@/components/chat-composer/token-mentions";
import { useCoinMentionRecord } from "@/components/chat-composer/use-token-mention-search";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPOSER_MENTION_ACCENT_CLASS,
  COMPOSER_MENTION_CHIP_CLASS,
  COMPOSER_MENTION_SECONDARY_CLASS,
} from "@/components/chat-composer/composer-theme";
import { cn } from "@/lib/utils";

type ComposerHighlightedTextareaProps = React.ComponentProps<typeof Textarea> & {
  overlayClassName?: string;
};

const assignRef = <T,>(ref: React.ForwardedRef<T>, value: T | null) => {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
};

const createKeyGenerator = (prefix = "composer-mention") => {
  let index = 0;
  return () => `${prefix}-${index++}`;
};

function ComposerCoinGeckoMention({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const mentionQuery = useCoinMentionRecord(id);
  const record = mentionQuery.data?.record;
  const displayName = record?.name ?? label;
  const displaySymbol = record?.symbol?.toUpperCase() ?? label.toUpperCase();
  const imageUrl = record?.imageUrl ?? undefined;
  const rawMarkup = buildCoinMentionMarkup({ id, label });

  return (
    <span className="relative inline-block align-baseline">
      <span className="invisible whitespace-pre-wrap">{rawMarkup}</span>
      <span className="pointer-events-none absolute inset-0 inline-flex items-center overflow-hidden">
        <span className={COMPOSER_MENTION_CHIP_CLASS}>
          <TokenIcon
            iconOverride={imageUrl}
            name={displayName}
            symbol={displaySymbol}
            size={14}
          />
          <span className={COMPOSER_MENTION_SECONDARY_CLASS}>{displayName}</span>
          <span className={COMPOSER_MENTION_ACCENT_CLASS}>{displaySymbol}</span>
        </span>
      </span>
    </span>
  );
}

const renderComposerTextWithCoinMentions = (
  text: string,
  getKey: () => string,
): ReactNode[] => {
  if (!text) {
    return [];
  }

  const mentions = extractCoinGeckoMentions(text);
  if (mentions.length === 0) {
    return [<Fragment key={getKey()}>{text}</Fragment>];
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const mention of mentions) {
    if (mention.start > cursor) {
      nodes.push(
        <Fragment key={getKey()}>{text.slice(cursor, mention.start)}</Fragment>,
      );
    }

    nodes.push(
      <ComposerCoinGeckoMention
        key={getKey()}
        id={mention.id}
        label={mention.label}
      />,
    );

    cursor = mention.end;
  }

  if (cursor < text.length) {
    nodes.push(<Fragment key={getKey()}>{text.slice(cursor)}</Fragment>);
  }

  return nodes;
};

export const ComposerHighlightedTextarea = forwardRef<
  HTMLTextAreaElement,
  ComposerHighlightedTextareaProps
>(function ComposerHighlightedTextarea(
  { className, onScroll, overlayClassName, value, ...props },
  forwardedRef,
) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textValue = useMemo(() => {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.join("\n");
    }

    return value == null ? "" : String(value);
  }, [value]);
  const mentionCount = useMemo(
    () => extractCoinGeckoMentions(textValue).length,
    [textValue],
  );
  const hasCoinGeckoMentions = mentionCount > 0;

  const syncOverlayScroll = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element || !overlayRef.current) {
      return;
    }

    overlayRef.current.scrollTop = element.scrollTop;
    overlayRef.current.scrollLeft = element.scrollLeft;
  }, []);

  const setRefs = useCallback(
    (element: HTMLTextAreaElement | null) => {
      textareaRef.current = element;
      assignRef(forwardedRef, element);
      syncOverlayScroll(element);
    },
    [forwardedRef, syncOverlayScroll],
  );

  return (
    <div className="relative">
      {hasCoinGeckoMentions ? (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words",
            overlayClassName,
          )}
        >
          {renderComposerTextWithCoinMentions(textValue, createKeyGenerator())}
        </div>
      ) : null}

      <Textarea
        {...props}
        ref={setRefs}
        value={value}
        onScroll={(event) => {
          syncOverlayScroll(event.currentTarget);
          onScroll?.(event);
        }}
        className={cn(
          className,
          hasCoinGeckoMentions &&
            "relative z-10 bg-transparent text-transparent caret-[var(--auth-composer-caret,var(--foreground))] [-webkit-text-fill-color:transparent] selection:bg-sky-500/20 selection:text-transparent",
        )}
      />
    </div>
  );
});
