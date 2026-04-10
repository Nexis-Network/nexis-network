"use client";

import { memo, useState, type ReactNode } from "react";
import { StreamdownRenderer } from "@/components/chat/streamdown/streamdown-renderer";
import {
  CrossChainMarketOverviewMessage,
  parseCrossChainMarketOverview,
} from "@/components/analytics/cross-chain-market-overview-message";
import {
  Loader,
  AgentOutputCard,
} from "@/components/dashboard/lazy-components";
import type { ConversationMessage } from "@/components/chat/types";
import { Action, Actions } from "@/components/ui/shadcn-io/ai/actions";
import { Separator } from "@/components/ui/separator";
import {
  CopyIcon,
  DownloadIcon,
  RefreshCcwIcon,
  ShareIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
} from "lucide-react";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import { deriveStructuredFallbackText } from "@/modules/chat/ui-fallback-text";
import { ASSISTANT_STREAMDOWN_CLASSNAME } from "./assistant-message-styles";

export type AssistantMessageContentProps = {
  message: ConversationMessage;
  isPending: boolean;
  hasError: boolean;
  hasRoutedPayload: boolean;
  structuredMarketOverview: ReturnType<typeof parseCrossChainMarketOverview>;
  showSources: boolean;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
};

export const AssistantMessageContent = memo(function AssistantMessageContent({
  message,
  isPending,
  hasError,
  hasRoutedPayload,
  structuredMarketOverview,
  showSources,
  onRegenerate,
  onEdit,
  onShare,
  onDelete,
}: AssistantMessageContentProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!message.content) return;
    const blob = new Blob([message.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${message.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (hasRoutedPayload && isPending && !message.content) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader size={14} />
        <span>Coordinating workflow…</span>
      </div>
    );
  }

  const renderPrimaryCard = (body: ReactNode) => (
    <AgentOutputCard
      agent={message.agent}
      title=""
      subtitle=""
      className="mt-0 border-none bg-transparent p-0 shadow-none"
    >
      {body}
    </AgentOutputCard>
  );

  if (hasError) {
    return renderPrimaryCard(
      <p className="text-sm leading-relaxed text-destructive">
        {message.content}
      </p>,
    );
  }

  if (message.content) {
    const safeSources = Array.isArray(message.sources) ? message.sources : [];

    if (structuredMarketOverview) {
      return <CrossChainMarketOverviewMessage data={structuredMarketOverview} />;
    }

    return (
      <div className="flex flex-col gap-4">
        {renderPrimaryCard(
          <StreamdownRenderer
            content={message.content}
            isStreaming={isPending}
            sources={safeSources}
            messageId={message.id}
            className={ASSISTANT_STREAMDOWN_CLASSNAME}
          />,
        )}
        <MessageActions
          copied={copied}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onShare={onShare}
          onDelete={onDelete}
          showSources={showSources}
          sources={safeSources}
        />
      </div>
    );
  }

  if (isPending) {
    return renderPrimaryCard(
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader size={14} />
        <span>{message.agent ? "Thinking…" : "Generating response…"}</span>
      </div>,
    );
  }

  const fallbackText =
    deriveStructuredFallbackText({
      role: message.role,
      content: message.content,
      parts: message.parts,
      payloads: message.payloads,
    }) || "The response completed without a visible result. Please try again.";

  return renderPrimaryCard(
    <p className="text-sm leading-relaxed text-muted-foreground dark:text-[#F0F0F0]">
      {fallbackText}
    </p>,
  );
});

type MessageActionsProps = {
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  showSources: boolean;
  sources: Array<{ url: string; title: string; snippet?: string }>;
};

function MessageActions({
  copied,
  onCopy,
  onDownload,
  onRegenerate,
  onEdit,
  onShare,
  onDelete,
  showSources,
  sources,
}: MessageActionsProps) {
  return (
    <Actions className="mt-1 shrink-0 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <div className="flex items-center gap-1">
        <Action
          tooltip={copied ? "Copied!" : "Copy"}
          onClick={onCopy}
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </Action>
        <Action
          tooltip="Download"
          onClick={onDownload}
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <DownloadIcon className="size-4" />
        </Action>
      </div>

      <Separator orientation="vertical" className="h-4 mx-1" />

      <div className="flex items-center gap-1">
        <Action
          tooltip="Regenerate"
          onClick={onRegenerate}
          disabled={!onRegenerate}
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <RefreshCcwIcon className="size-4" />
        </Action>
        <Action
          tooltip="Edit response"
          onClick={onEdit}
          disabled={!onEdit}
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <EditIcon className="size-4" />
        </Action>
      </div>

      <Separator orientation="vertical" className="h-4 mx-1" />

      <div className="flex items-center gap-1">
        <Action
          tooltip="Share"
          onClick={onShare}
          disabled={!onShare}
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <ShareIcon className="size-4" />
        </Action>
        <Action
          tooltip="Delete"
          onClick={onDelete}
          variant="ghost"
          disabled={!onDelete}
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <TrashIcon className="size-4" />
        </Action>
        {showSources && sources.length > 0 ? (
          <Sources className="mb-0">
            <SourcesTrigger count={sources.length} sources={sources} />
            <SourcesContent>
              {sources.map((source, i) => (
                <Source
                  key={`${source.url}-${i}`}
                  description={source.snippet}
                  href={source.url}
                  title={source.title}
                />
              ))}
            </SourcesContent>
          </Sources>
        ) : null}
      </div>
    </Actions>
  );
}
