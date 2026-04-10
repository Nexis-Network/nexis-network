import type { AssistantPayload } from "@/components/dashboard/chat-types";
import type { AIAgentStream, Source } from "@/lib/schema";

export type NexChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
  thoughts?: AIAgentStream[];
  payloads?: AssistantPayload[];
  sources?: Source[];
  parts?: Array<{
    type: string;
    text?: string;
    toolName?: string;
    result?: UntypedJson;
    [key: string]: UntypedJson;
  }>;
};
