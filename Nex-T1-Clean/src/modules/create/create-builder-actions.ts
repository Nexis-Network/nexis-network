import { startTransition } from "react";
import { toast } from "sonner";

import {
  claimCreateProjectRequest,
  createProjectRequest,
  sendCreateMessageRequest,
} from "@/modules/create/api";
import {
  createProjectStreamRequest,
  readCreateStream,
  sendCreateMessageStreamRequest,
} from "@/modules/create/client-stream";
import type {
  CreateNormalizedMessage,
  CreateTemplateId,
} from "@/modules/create/types";

export function createOptimisticMessage(
  role: "assistant" | "user",
  text: string,
): CreateNormalizedMessage {
  const id = `local-${role}-${crypto.randomUUID()}`;
  return {
    contentText: text,
    createdAt: new Date().toISOString(),
    id,
    parts: [{ text, type: "text" }],
    providerMessageId: id,
    role,
  };
}

export function isUuid(value: string | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

export async function claimCreateProjectWithRefresh(args: {
  loadWorkspace: (preferredProjectId?: string | null) => Promise<void>;
  projectId: string;
  setError: (message: string | null) => void;
}): Promise<void> {
  try {
    const project = await claimCreateProjectRequest(args.projectId);
    toast.success("Guest project claimed.");
    await args.loadWorkspace(project.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to claim project.";
    args.setError(message);
    toast.error(message);
  }
}

export async function submitCreatePrompt(args: {
  activeProjectId: string | null;
  loadWorkspace: (preferredProjectId?: string | null) => Promise<void>;
  messages: CreateNormalizedMessage[];
  prompt: string;
  selectedTemplateId: CreateTemplateId;
  setActiveProjectId: (value: string | null) => void;
  setError: (message: string | null) => void;
  setInput: (value: string) => void;
  setMessages: (updater: CreateNormalizedMessage[] | ((current: CreateNormalizedMessage[]) => CreateNormalizedMessage[])) => void;
  setMobileTab: (value: string) => void;
  setSubmitting: (value: boolean) => void;
  setStreamingText: (updater: string | ((current: string) => string)) => void;
  streamEnabled: boolean;
}): Promise<void> {
  const trimmed = args.prompt.trim();
  if (!trimmed) {
    return;
  }

  const previousMessages = args.messages;
  args.setError(null);
  args.setInput("");
  args.setSubmitting(true);
  args.setStreamingText("");
  args.setMessages((current) => [...current, createOptimisticMessage("user", trimmed)]);

  try {
    if (!args.activeProjectId) {
      if (args.streamEnabled) {
        const response = await createProjectStreamRequest({
          prompt: trimmed,
          templateId: args.selectedTemplateId,
        });
        await readCreateStream(response, (event) => {
          if (event.type === "assistant-delta") args.setStreamingText((current) => current + event.delta);
          if (event.type === "done") {
            args.setStreamingText("");
            args.setMessages(event.messages);
            startTransition(() => {
              args.setActiveProjectId(event.project.id);
              args.setMobileTab("preview");
            });
            void args.loadWorkspace(event.project.id);
          }
          if (event.type === "error") throw new Error(event.message);
        });
      } else {
        const result = await createProjectRequest({
          prompt: trimmed,
          stream: false,
          templateId: args.selectedTemplateId,
        });
        args.setMessages(result.messages);
        startTransition(() => {
          args.setActiveProjectId(result.project.id);
          args.setMobileTab("preview");
        });
        await args.loadWorkspace(result.project.id);
      }
    } else if (args.streamEnabled) {
      const response = await sendCreateMessageStreamRequest({
        projectId: args.activeProjectId,
        prompt: trimmed,
      });
      await readCreateStream(response, (event) => {
        if (event.type === "assistant-delta") args.setStreamingText((current) => current + event.delta);
        if (event.type === "done") {
          args.setStreamingText("");
          args.setMessages(event.messages);
          startTransition(() => args.setMobileTab("preview"));
          void args.loadWorkspace(event.project.id);
        }
        if (event.type === "error") throw new Error(event.message);
      });
    } else {
      const result = await sendCreateMessageRequest({
        projectId: args.activeProjectId,
        prompt: trimmed,
        stream: false,
      });
      args.setMessages(result.messages);
      startTransition(() => args.setMobileTab("preview"));
      await args.loadWorkspace(result.project.id);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate the project.";
    args.setMessages(previousMessages);
    args.setStreamingText("");
    args.setError(message);
    toast.error(message);
  } finally {
    args.setSubmitting(false);
  }
}
