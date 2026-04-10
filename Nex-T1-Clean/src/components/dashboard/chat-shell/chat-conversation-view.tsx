"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationAutoScroll,
  ConversationContent,
  ConversationScrollButton,
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/dashboard/lazy-components";
import { VirtualizedMessageList } from "@/components/chat/conversation/virtualized-message-list";
import { AssistantMessage, UserMessage } from "@/components/chat/message";
import type { ConversationMessage } from "@/components/dashboard/chat-types";
import type { ChatCheckpoint } from "@/components/chat/types";
import { cn } from "@/lib/utils";
import { CHAT_CONVERSATION_WIDTH_CLASS } from "./constants";
import { ChatEmptyState } from "./chat-empty-state";
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";
import { formatDistanceToNow } from "date-fns";
import type { AgentState as VoiceAgentState } from "@/components/ui/bar-visualizer";
import type { AgentState as OrbAgentState } from "@/components/ui/orb";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { useResponsiveConversationLayout } from "./use-responsive-conversation-layout";

const PongGame = dynamic(
  async () => (await import("@/components/visuals/demos/pong-game")).PongGame,
  {
    ssr: false,
    loading: () => null,
  },
);

const VoiceOrb = dynamic(
  () => import("@/components/ui/orb").then((mod) => mod.Orb),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto h-full w-full max-w-[320px] animate-pulse rounded-full bg-linear-to-br from-primary/15 via-primary/5 to-transparent sm:max-w-[420px]" />
    ),
  },
);

type ChatConversationViewProps = {
  addLeftInset?: boolean;
  conversationWidthClass?: string;
  messages: ConversationMessage[];
  autoScrollTrigger: string;
  isAutoScrollActive: boolean;
  voiceModeActive: boolean;
  onFollowUpDecision: (
    messageId: string,
    suggestionId: string,
    decision: "accept" | "decline",
  ) => void;
  onFollowUpQuestion: (question: string) => void;
  onRegenerate: (messageId: string) => Promise<void>;
  onEdit: (messageId: string) => void;
  onDelete: (messageId: string) => Promise<void>;
  onShare: (messageId: string) => Promise<void>;
  checkpoints: ChatCheckpoint[];
  onCheckpointCreate: (messageId: string, label?: string) => void;
  onCheckpointRestore: (checkpointId: string) => void;
};

export const ChatConversationView = memo(function ChatConversationView({
  addLeftInset = false,
  conversationWidthClass = CHAT_CONVERSATION_WIDTH_CLASS,
  messages,
  autoScrollTrigger,
  isAutoScrollActive,
  voiceModeActive,
  onFollowUpDecision,
  onFollowUpQuestion,
  onRegenerate,
  onEdit,
  onDelete,
  onShare,
  checkpoints,
  onCheckpointCreate,
  onCheckpointRestore,
}: ChatConversationViewProps) {
  const checkpointLookup = useMemo(() => {
    const map = new Map<string, ChatCheckpoint>();
    checkpoints.forEach((checkpoint) => {
      map.set(checkpoint.messageId, checkpoint);
    });
    return map;
  }, [checkpoints]);

  const shouldShowVoiceStage = voiceModeActive;
  const conversationInsetClass = addLeftInset ? "pl-4 md:pl-6 lg:pl-8" : "";
  const { contentRef, layoutStyle } = useResponsiveConversationLayout();

  return (
    <Conversation
      className={cn(
        "app-chat-workspace-fade mx-auto flex h-full min-h-0 w-full flex-1 flex-col overflow-x-hidden pt-20",
        conversationWidthClass,
      )}
    >
      <ConversationContent
        ref={contentRef}
        className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col p-0"
        style={layoutStyle}
      >
        {shouldShowVoiceStage ? (
          <VoiceConversationStage voiceModeActive={voiceModeActive} />
        ) : (
          <>
            <ConversationAutoScroll
              trigger={autoScrollTrigger}
              active={isAutoScrollActive}
            />
            {messages.length === 0 ? (
              <div className="flex h-full w-full flex-1 items-center justify-center">
                <div
                  className={cn(
                    "mx-auto flex w-full items-center justify-center p-0",
                    conversationWidthClass,
                  )}
                >
                  <ChatEmptyState />
                </div>
              </div>
            ) : (
              <VirtualizedMessageList
                messages={messages}
                renderMessage={(message, index) => {
                  const checkpoint = checkpointLookup.get(message.id);
                  const isAssistant = message.role === "assistant";
                  const shouldShowPlaceholder =
                    !checkpoint && (index + 1) % 10 === 0;
                  const shouldRenderCheckpoint =
                    checkpoint || shouldShowPlaceholder;

                  if (!isAssistant) {
                    return <UserMessage message={message} />;
                  }

                  return (
                    <div className="space-y-3">
                      <AssistantMessage
                        message={message}
                        onFollowUpDecision={(suggestionId, decision) =>
                          onFollowUpDecision(message.id, suggestionId, decision)
                        }
                        onFollowUpQuestion={onFollowUpQuestion}
                        onRegenerate={() => onRegenerate(message.id)}
                        onEdit={() => onEdit(message.id)}
                        onDelete={() => onDelete(message.id)}
                        onShare={() => onShare(message.id)}
                      />
                      {shouldRenderCheckpoint ? (
                        <ConversationCheckpointRow
                          checkpoint={checkpoint}
                          messageId={message.id}
                          onCreate={onCheckpointCreate}
                          onRestore={onCheckpointRestore}
                          showCreate={!checkpoint && shouldShowPlaceholder}
                        />
                      ) : null}
                    </div>
                  );
                }}
                autoScroll={isAutoScrollActive}
                autoScrollTrigger={autoScrollTrigger}
                className={cn(
                  "flex h-full w-full flex-1 flex-col pt-[104px] sm:pt-[125px]",
                  "min-w-0 max-w-full",
                  conversationInsetClass,
                )}
              />
            )}

            {/* Pong easter egg - only available in development */}
            {process.env.NODE_ENV === "development" &&
              (() => {
                const last = messages.at(-1);
                const wantsPong =
                  Boolean(last) &&
                  last!.role === "user" &&
                  /\bplay\s+pong\b/i.test((last!.content ?? "").trim());
                if (!wantsPong) return null;
                return (
                  <Message from="assistant" key="pong-injected">
                    <MessageAvatar
                      role="assistant"
                      model="openai/gpt-5.4"
                      conversationId="pong-injected"
                      fallbackLabel="Nex Instant"
                    />
                    <MessageContent variant="flat">
                      <div className="rounded-xl bg-background/70 p-0">
                        <PongGame />
                      </div>
                    </MessageContent>
                  </Message>
                );
              })()}
          </>
        )}
      </ConversationContent>
      {!shouldShowVoiceStage && <ConversationScrollButton />}
    </Conversation>
  );
});

const clamp01 = (value: UntypedJson) => {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(1, Math.max(0, num));
};

const mapVoiceStateToOrb = (state?: VoiceAgentState): OrbAgentState => {
  if (state === "speaking") return "talking";
  if (state === "listening") return "listening";
  // connecting / initializing / thinking -> idle visual
  return null;
};

const VoiceConversationStage = ({
  voiceModeActive,
}: {
  voiceModeActive: boolean;
}) => {
  const [agentState, setAgentState] = useState<OrbAgentState>(null);
  const [volumes, setVolumes] = useState({ input: 0, output: 0 });
  const volumeRef = useRef({ input: 0, output: 0 });
  const rafRef = useRef<number | null>(null);

  const handleVolumeEvent = useCallback(
    (event: Event) => {
      if (!voiceModeActive) return;
      const detail = (event as CustomEvent).detail as
        | { input?: number; output?: number }
        | undefined;
      volumeRef.current = {
        input: clamp01(detail?.input),
        output: clamp01(detail?.output),
      };
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        setVolumes(volumeRef.current);
        rafRef.current = null;
      });
    },
    [voiceModeActive],
  );

  const handleStateEvent = useCallback(
    (event: Event) => {
      if (!voiceModeActive) return;
      const detail = (event as CustomEvent).detail as
        | { state?: VoiceAgentState }
        | undefined;
      setAgentState(mapVoiceStateToOrb(detail?.state));
    },
    [voiceModeActive],
  );

  useEffect(() => {
    if (!voiceModeActive) {
      setAgentState(null);
      setVolumes({ input: 0, output: 0 });
      return;
    }

    window.addEventListener(
      "nex:voiceVolumesChanged",
      handleVolumeEvent as EventListener,
    );
    window.addEventListener(
      "nex:voiceAgentStateChanged",
      handleStateEvent as EventListener,
    );

    return () => {
      window.removeEventListener(
        "nex:voiceVolumesChanged",
        handleVolumeEvent as EventListener,
      );
      window.removeEventListener(
        "nex:voiceAgentStateChanged",
        handleStateEvent as EventListener,
      );
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [voiceModeActive, handleStateEvent, handleVolumeEvent]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const statusLabel =
    agentState === "talking"
      ? "Talking"
      : agentState === "listening"
        ? "Listening"
        : "Idle";

  return (
    <div className="flex h-full w-full flex-1 items-center justify-center py-6 sm:py-10">
      <div className="relative flex w-full max-w-full flex-col items-center gap-0.5 p-1 sm:p-1">
        <div className="relative flex items-center mb-2 justify-center rounded-full border border-zinc-700/12 bg-zinc-500/10 backdrop-blur-md h-[clamp(96px,24vw,161px)] w-[clamp(96px,24vw,161px)] overflow-hidden">
          <div className="absolute inset-0">
            <VoiceOrb
              agentState={agentState}
              volumeMode="manual"
              manualInput={volumes.input}
              manualOutput={volumes.output}
              resizeDebounce={150}
              className="h-full w-full rounded-full border border-zinc-300/20 [&>div]:h-full [&>div]:w-full"
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span
            className="flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400 backdrop-blur-md"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-sky-400/60 blur-[1px] animate-ping"
                aria-hidden="true"
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_0_4px_rgba(56,189,248,0.18)]" />
            </span>
            <ShimmeringText
              text={statusLabel}
              color="#38bdf8"
              shimmerColor="#7dd3fc"
              duration={2.4}
              repeatDelay={0.9}
              className="text-[11px]"
            />
          </span>
        </div>
      </div>
    </div>
  );
};

const ConversationCheckpointRow = ({
  checkpoint,
  messageId,
  onCreate,
  onRestore,
  showCreate,
}: {
  checkpoint: ChatCheckpoint | undefined;
  messageId: string;
  onCreate: (messageId: string) => void;
  onRestore: (checkpointId: string) => void;
  showCreate: boolean;
}) => {
  if (!checkpoint && !showCreate) {
    return null;
  }

  if (!checkpoint) {
    return (
      <Checkpoint className="w-full items-center gap-2 py-1 text-xs text-muted-foreground">
        <CheckpointIcon className="text-muted-foreground" />
        <CheckpointTrigger
          tooltip="Bookmark this point to rewind later"
          onClick={() => onCreate(messageId)}
          variant="ghost"
          size="sm"
        >
          Save checkpoint
        </CheckpointTrigger>
      </Checkpoint>
    );
  }

  return (
    <Checkpoint className="w-full items-center gap-2 py-1 text-xs text-muted-foreground">
      <CheckpointIcon className="text-primary" />
      <div className="flex flex-1 items-center justify-between">
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">Checkpoint saved</p>
          <p className="text-muted-foreground">
            {formatDistanceToNow(new Date(checkpoint.createdAt), {
              addSuffix: true,
            })}
          </p>
          {checkpoint.summary && (
            <p className="text-muted-foreground/80 italic">
              “{checkpoint.summary}”
            </p>
          )}
        </div>
        <CheckpointTrigger
          tooltip="Restore the conversation to this point"
          onClick={() => onRestore(checkpoint.id)}
          size="sm"
        >
          Restore
        </CheckpointTrigger>
      </div>
    </Checkpoint>
  );
};
