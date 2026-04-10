import { createMcpCommandTool } from "./mcp-tool-factory";
import {
  PumpFunChatMcpClient,
  defaultPumpFunChatClient,
} from "@/server/services/mcp/pumpfun-chat-client";
import {
  autoApproveRequest,
  createApprovalRequest,
  getUserAgentSettings,
  shouldAutoApprove,
  waitForApproval,
} from "@/lib/approvals/state-machine";

const PUMPFUN_CHAT_TOOL_NAMES = [
  "PumpFunChat_ReadMessages",
  "PumpFunChat_GetLatestMessage",
  "PumpFunChat_SendMessage",
  "PumpFunChat_GetStatus",
] as const;

export const pumpFunChatTool = createMcpCommandTool({
  name: "pumpfun_chat",
  description:
    "Interact with Pump.fun token chat rooms. Read recent conversations, inspect status, or send messages when authenticated.",
  commandNames: PUMPFUN_CHAT_TOOL_NAMES,
  client: defaultPumpFunChatClient,
  clientFactory: () => new PumpFunChatMcpClient(),
  beforeInvoke: async ({ command, args }) => {
    if (command !== "PumpFunChat_SendMessage") {
      return;
    }

    const message =
      typeof args?.message === "string" ? args.message.trim() : "";
    if (!message) {
      throw new Error("Pump.fun chat message cannot be empty.");
    }

    const { createClient } = await import("@/server/services/supabase/server");
    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase client is not configured");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
    if (!user) {
      throw new Error("Authentication required to send Pump.fun chat messages.");
    }

    const userId = user.id;
    const settings = await getUserAgentSettings(userId);

    const preview = {
      title: "Send Pump.fun Chat Message",
      description: "Post a message to a Pump.fun token chat room.",
      items: [
        {
          label: "Message Preview",
          value: message.length > 120 ? `${message.slice(0, 117)}…` : message,
          highlight: true,
        },
      ],
      warnings: [
        "Pump.fun messages are public and immutable once posted.",
        "Do not share sensitive information or private keys in chat.",
      ],
      estimatedCost: {
        amount: "0",
        currency: "SOL",
        usd: "0.00",
      },
    };

    const approvalPayload = {
      toolId: "pumpfun_chat" as const,
      command,
      args: { message },
      preview,
    };

    const estimatedCostUsd = "0.00";
    if (shouldAutoApprove(settings, estimatedCostUsd)) {
      await autoApproveRequest(userId, approvalPayload);
      return;
    }

    const approval = await createApprovalRequest(userId, approvalPayload);
    const decision = await waitForApproval(approval.id, userId);
    if (!decision.approved) {
      throw new Error(decision.reason ?? "Pump.fun chat message was rejected.");
    }
  },
});
