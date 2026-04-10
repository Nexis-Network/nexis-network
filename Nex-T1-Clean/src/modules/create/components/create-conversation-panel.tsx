"use client";

import {
  Conversation,
  ConversationAutoScroll,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { cn } from "@/lib/utils";
import type {
  CreateCapability,
  CreateNormalizedMessage,
  CreateProject,
  CreateTemplate,
  CreateTemplateId,
} from "@/modules/create/types";
import { FolderKanban } from "lucide-react";
import type { ReactNode } from "react";

import { CreateConversationComposer } from "./create-conversation-composer";
import { CreateConversationHeader } from "./create-conversation-header";

type CreateConversationPanelProps = {
  activeProject: CreateProject | null;
  capabilities: readonly CreateCapability[];
  error: string | null;
  historyAction?: ReactNode;
  input: string;
  messages: CreateNormalizedMessage[];
  onInputChange: (value: string) => void;
  onStreamEnabledChange: (value: boolean) => void;
  onSubmit: (prompt: string) => void;
  onTemplateChange: (value: CreateTemplateId) => void;
  selectedTemplateId: CreateTemplateId;
  streamEnabled: boolean;
  streamingText: string;
  submitting: boolean;
  templates: readonly CreateTemplate[];
};

function buildVisibleMessages({
  messages,
  streamingText,
  submitting,
}: {
  messages: CreateNormalizedMessage[];
  streamingText: string;
  submitting: boolean;
}): CreateNormalizedMessage[] {
  if (!submitting) {
    return messages;
  }

  return [
    ...messages,
    {
      contentText: streamingText || "Preparing build preview...",
      createdAt: new Date().toISOString(),
      id: "streaming-assistant",
      parts: [{ text: streamingText || "Preparing build preview...", type: "text" }],
      providerMessageId: "streaming-assistant",
      role: "assistant",
    },
  ];
}

export function CreateConversationPanel({
  activeProject,
  capabilities,
  error,
  historyAction,
  input,
  messages,
  onInputChange,
  onStreamEnabledChange,
  onSubmit,
  onTemplateChange,
  selectedTemplateId,
  streamEnabled,
  streamingText,
  submitting,
  templates,
}: CreateConversationPanelProps) {
  const activeTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0];
  const visibleMessages = buildVisibleMessages({
    messages,
    streamingText,
    submitting,
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--auth-card-bg)] text-[var(--auth-text-primary)]">
      <CreateConversationHeader
        activeProject={activeProject}
        activeTemplate={activeTemplate}
        capabilities={capabilities}
        error={error}
        historyAction={historyAction}
        onStreamEnabledChange={onStreamEnabledChange}
        onSubmit={onSubmit}
        onTemplateChange={onTemplateChange}
        selectedTemplateId={selectedTemplateId}
        streamEnabled={streamEnabled}
        templates={templates}
      />

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pb-6 pt-5">
          {visibleMessages.length === 0 ? (
            <div className="flex min-h-[18rem] flex-col justify-center gap-4 rounded-[28px] border border-dashed border-[var(--auth-border-subtle)] bg-[var(--auth-elevated-bg)] px-6 py-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[var(--auth-text-muted)]">
                <FolderKanban className="size-4" />
                Ready to build
              </div>
              <div className="space-y-2">
                <h2 className="font-medium text-lg">Start with the exact user journey you want.</h2>
                <p className="max-w-xl text-sm leading-6 text-[var(--auth-text-secondary)]">
                  Mention auth, billing, wallet connect, chain support, dashboards, and any onchain actions. The first prompt becomes the project brief for the preview on the right.
                </p>
              </div>
            </div>
          ) : (
            visibleMessages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent
                  className={cn(
                    message.role === "assistant"
                      ? "px-0 text-[var(--auth-text-primary)]"
                      : "rounded-2xl bg-[var(--auth-app-bg)] text-[var(--auth-text-inverse)] shadow-none",
                  )}
                  variant={message.role === "user" ? "contained" : "flat"}
                >
                  {message.role === "assistant" ? (
                    <Response>{message.contentText}</Response>
                  ) : (
                    <div className="whitespace-pre-wrap leading-6">{message.contentText}</div>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          <ConversationAutoScroll active={submitting} trigger={`${visibleMessages.length}:${streamingText}`} />
        </ConversationContent>
      </Conversation>

      <CreateConversationComposer
        input={input}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        submitting={submitting}
        templateLabel={activeTemplate?.label}
      />
    </div>
  );
}
