"use client";

import { shouldRenderPayloadInline } from "./assistant-inline-payloads";
import {
  CHAT_THREAD_ASSISTANT_CONTENT_CLASSNAME,
  CHAT_THREAD_MESSAGE_ROW_CLASSNAME,
} from "./thread-layout";

import { memo, useMemo, type ReactNode, useState } from "react";
import {
  Message,
  MessageAvatar,
  MessageContent,
  Connection,
  Canvas,
  Confirmation,
} from "@/components/dashboard/lazy-components";
import { PayloadRenderer } from "../payloads/payload-renderer";
import { Button } from "@/components/ui/button";
import {
  parseCrossChainMarketOverview,
} from "@/components/analytics/cross-chain-market-overview-message";
import { ensureDisplayPreferences } from "@/components/dashboard/chat-intent";
import type {
  AssistantPayload,
  ConversationMessage,
} from "@/components/chat/types";
import type { PythChartPayload } from "@/components/dashboard/chat-types";
import { Image as AIImage } from "@/components/ai-elements/image";
import { TestResults } from "@/components/ai-elements/test-results";
import type { ConnectionStatus } from "@/components/ai-elements/connection";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { CodeInterpreterResult } from "./code-interpreter-result";
import { AssistantSandboxSession } from "./assistant-sandbox-session";
import { resolveModelLabel } from "@/lib/ai/nex-models";
import { extractNativeMessageState } from "@/modules/chat/ui-message-parts";
import { AssistantMessageContent } from "./assistant-message-content";

type AssistantMessageProps = {
  message: ConversationMessage;
  onFollowUpDecision?: (
    suggestionId: string,
    decision: "accept" | "decline",
  ) => void;
  onFollowUpQuestion?: (question: string) => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
};

type ElementPayload = AssistantPayload & { element: ReactNode };

const hasRenderableElement = (
  payload: AssistantPayload,
): payload is ElementPayload => {
  const maybeElement = (payload as { element?: ReactNode | null }).element;
  return maybeElement !== undefined && maybeElement !== null;
};

export const AssistantMessage = memo(function AssistantMessage({
  message,
  onFollowUpDecision,
  onFollowUpQuestion,
  onRegenerate,
  onEdit,
  onShare,
  onDelete,
}: AssistantMessageProps) {
  const isPending = message.status === "pending";
  const hasError = message.status === "error";
  const payloads = useMemo(
    () => (Array.isArray(message.payloads) ? message.payloads : []),
    [message.payloads],
  );
  const safeSuggestions = Array.isArray(message.suggestions)
    ? message.suggestions
    : [];
  const safeFollowUpQuestions = Array.isArray(message.followUpQuestions)
    ? message.followUpQuestions
    : [];
  const pythPayloads = payloads.filter(
    (item): item is PythChartPayload => item.type === "pyth-chart",
  );
  const preferences = ensureDisplayPreferences(message.displayPreferences);
  const structuredMarketOverview = useMemo(
    () =>
      message.content ? parseCrossChainMarketOverview(message.content) : null,
    [message.content],
  );

  const hasRoutedPayload = payloads.some((p) => p.type === "orchestration");
  const visiblePayloads = payloads.filter(
    (p) =>
      p.type !== "image-artifact" &&
      !hasRenderableElement(p) &&
      shouldRenderPayloadInline(p),
  );
  const imageArtifacts = payloads.filter(
    (p): p is Extract<AssistantPayload, { type: "image-artifact" }> =>
      p.type === "image-artifact",
  );
  const rscPayloads = payloads.filter(hasRenderableElement);
  const nativeState = useMemo(
    () => extractNativeMessageState(message.parts),
    [message.parts],
  );
  const connectionStatus: ConnectionStatus =
    message.status === "pending"
      ? "streaming"
      : hasError
        ? "error"
        : "complete";
  const assistantLabel = useMemo(
    () => resolveModelLabel(message.model, "Nex Instant"),
    [message.model],
  );

  return (
    <Message
      from="assistant"
      key={message.id}
      className={CHAT_THREAD_MESSAGE_ROW_CLASSNAME}
    >
      <MessageAvatar
        role="assistant"
        agentName={message.agent?.name ?? null}
        model={message.model ?? null}
        conversationId={message.id}
        fallbackLabel={assistantLabel}
      />
      <MessageContent
        variant="flat"
        className={CHAT_THREAD_ASSISTANT_CONTENT_CLASSNAME}
      >
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {assistantLabel}
        </div>

        <AssistantMessageContent
          message={message}
          isPending={isPending}
          hasError={hasError}
          hasRoutedPayload={hasRoutedPayload}
          structuredMarketOverview={structuredMarketOverview}
          showSources={preferences.showSources}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onShare={onShare}
          onDelete={onDelete}
        />
        <AssistantSandboxSession message={message} />

        <ImageArtifacts artifacts={imageArtifacts} />
        <RscBlocks payloads={rscPayloads} status={connectionStatus} />

        {visiblePayloads.map((payload, index) => (
          <PayloadRenderer
            key={`${message.id}-payload-${index}`}
            payload={payload}
            index={index}
            messageId={message.id}
            preferences={preferences}
            pythPayloads={pythPayloads}
            requestedTickers={message.requestedTickers ?? []}
          />
        ))}

        {nativeState.testResults?.items?.length ? (
          <TestResults items={nativeState.testResults.items} />
        ) : null}

        {(message.toolInvocations ?? []).map((tool, i) => {
          if (tool.toolName !== "e2b_code_interpreter" || tool.state !== "result") return null;
          return <CodeInterpreterResult key={`e2b-result-${i}`} toolInvocation={tool} result={tool.result} />;
        })}

        {safeSuggestions.map((suggestion) => {
          if (suggestion.status === "accepted" || suggestion.status === "dismissed") return null;
          return (
            <Confirmation
              key={suggestion.id}
              title="Follow-up suggestion"
              description={suggestion.question}
              confirmLabel={suggestion.confirmLabel}
              declineLabel={suggestion.declineLabel}
              isPending={suggestion.status === "processing"}
              onConfirm={() => onFollowUpDecision?.(suggestion.id, "accept")}
              onDecline={() => onFollowUpDecision?.(suggestion.id, "decline")}
            />
          );
        })}

        {safeFollowUpQuestions.length > 0 && (
          <FollowUpQuestions questions={safeFollowUpQuestions} onQuestionClick={onFollowUpQuestion} />
        )}

        {message.toolInvocation && (
          <p className="text-muted-foreground text-[11px] uppercase tracking-wide">
            {message.toolInvocation.name}
            {message.toolInvocation.description ? ` • ${message.toolInvocation.description}` : ""}
          </p>
        )}
      </MessageContent>
    </Message>
  );
});

const FollowUpQuestions = ({ questions, onQuestionClick }: { questions: string[]; onQuestionClick?: (q: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="w-full mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="font-medium">Follow up questions</span>
        <ChevronRight className={cn("w-4 h-4 transition-transform text-muted-foreground group-hover:text-foreground", isOpen ? "rotate-90" : "")} />
      </button>
      {isOpen && (
        <div className="flex flex-wrap gap-2 mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
          {questions.map((question, i) => (
            <Button key={i} variant="outline" size="sm" className="max-w-full shrink whitespace-normal wrap-break-word text-left text-xs font-medium text-foreground h-auto py-2" onClick={() => onQuestionClick?.(question)}>
              {question}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

const ImageArtifacts = ({ artifacts }: { artifacts: Extract<AssistantPayload, { type: "image-artifact" }>[] }) => {
  if (!artifacts.length) return null;
  return (
    <Canvas title="Images" subtitle="Generated by the agent">
      <div className="grid gap-3 sm:grid-cols-2">
        {artifacts.map((artifact, index) => (
          <div key={`${artifact.url}-${index}`} className="space-y-2 rounded-lg border border-border/40 bg-muted/40 p-2">
            <AIImage url={artifact.url} alt={artifact.prompt} className="w-full rounded-md" />
            <p className="text-xs text-muted-foreground">{artifact.prompt}</p>
          </div>
        ))}
      </div>
    </Canvas>
  );
};

const RscBlocks = ({ payloads, status }: { payloads: ElementPayload[]; status: ConnectionStatus }) => {
  if (!payloads.length) return null;
  return (
    <div className="space-y-3">
      {payloads.map((payload, index) => (
        <Canvas key={`rsc-${index}`} title="Live component" subtitle="Streamed from the agent (RSC)" className="border-border/70">
          <Connection status={status} label="RSC stream" />
          <div className="mt-2">{payload.element}</div>
        </Canvas>
      ))}
    </div>
  );
};
