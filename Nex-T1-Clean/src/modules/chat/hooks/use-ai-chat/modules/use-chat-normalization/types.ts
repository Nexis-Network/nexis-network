import type { UIMessage } from "ai";
import type { AssistantPayload } from "@/components/dashboard/chat-types";
import type { NexChatMessage } from "@/types/chat-message";
import type { AppChatDataParts } from "../../chat-data-parts";

export type { NexChatMessage };

export type MessagePart = {
  type: string;
  text?: string;
  [key: string]: UntypedJson;
};

export type ToolInvocationCompat = {
  toolCallId?: string;
  id?: string;
  state?: "call" | "partial-call" | "result" | string;
  toolName?: string;
  args?: UntypedJson;
  result?: UntypedJson;
};

export type AnyUIMessage = UIMessage<unknown, AppChatDataParts> & {
  content?: string;
  createdAt?: Date | string;
  toolInvocations?: ToolInvocationCompat[];
};

export type ToolExecutionPayload = Extract<
  AssistantPayload,
  { type: "tool-execution" }
>;

export type ToolExecutionStatus = ToolExecutionPayload["status"];
