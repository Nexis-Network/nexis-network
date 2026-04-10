import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { streamObject, type UIMessage } from "ai";

import {
  createErrorResponse,
  createRateLimitResponse,
  createCompositeRateLimitKey,
  extractClientIP,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import { tasksSchema } from "@/lib/schema";
import { createClient as createSupabaseServerClient } from "@/server/services/supabase/server";
import {
  ensureConversationRecord,
  generateConversationTitle,
  persistConversationMessage,
} from "@/server/chat/conversation-store";
import { withAuth } from "@/server/security/with-auth";
import { recordAiTelemetry } from "@/server/services/ai-sdk/tool-registry";


import { logger } from '@/lib/logger';
type TaskItem = {
  type: "text" | "file";
  content: string;
  status: "pending" | "in_progress" | "completed";
  file?: {
    name: string;
    icon: "react" | "typescript" | "javascript" | "css" | "html" | "json" | "markdown";
  };
};

type AgentTaskBundle = {
  title: string;
  items: TaskItem[];
};

type AgentTaskResult = {
  tasks: AgentTaskBundle[];
};

// Allow streaming responses up to 30 seconds
export const maxDuration = 5;

export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth(req, { requireOrg: false });
    if (!auth.ok) {
      return auth.response;
    }

    const rateKey = createCompositeRateLimitKey({
      clientIP: extractClientIP(req),
      route: "ai-agent",
      orgId: auth.orgId,
      userId: auth.session?.user.id ?? null,
    });
    const rateLimitResult = await handleRequestRateLimitWithKey(rateKey);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.errorResponse);
    }

    const startedAt = Date.now();

    const body = (await req.json()) as {
      prompt?: UntypedJson;
      conversationId?: UntypedJson;
    };

    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return createErrorResponse(new Error("Prompt is required."), {
        status: 400,
        customMessage: "Prompt is required.",
      });
    }

    const requestedConversationId =
      typeof body?.conversationId === "string" && body.conversationId.trim().length > 0
        ? body.conversationId.trim()
        : null;

    let supabaseClient: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
    let conversationId = requestedConversationId;

    const userMessage: UIMessage | null = prompt
      ? {
        id: `agent-user-${randomUUID()}`,
        role: "user",
        parts: [
          {
            type: "text",
            text: prompt,
          },
        ],
      }
      : null;

    const userId = auth.session?.user.id ?? null;
    if (userId && userMessage) {
      try {
        supabaseClient = await createSupabaseServerClient();
      } catch (error) {
        logger.error("[agent] failed to create Supabase server client", error);
      }

      if (supabaseClient) {
        try {
          const ensured = await ensureConversationRecord(supabaseClient, userId, conversationId, {
            title: generateConversationTitle([userMessage]),
            model: "openai/gpt-5.4",
          });
          conversationId = ensured.id;

          await persistConversationMessage({
            supabase: supabaseClient,
            conversationId,
            message: userMessage,
            fallbackContent: prompt,
          });
        } catch (error) {
          logger.error("[agent] failed to persist user prompt", error);
        }
      }
    }

    const result = streamObject({
      model: "openai/gpt-5.4",
      schema: tasksSchema,
      prompt: `You are 'Nex' an AI assistant that generates realistic development task workflows. Generate a set of tasks that would occur during ${prompt}.
  
      Each task should have:
      - A descriptive title
      - Multiple task items showing the progression
      - Some items should be plain text, others should reference files
      - Use realistic file names and appropriate file types
      - Status should progress from pending to in_progress to completed

      For file items, use these icon types: 'react', 'typescript', 'javascript', 'css', 'html', 'json', 'markdown'

      Generate 2-3 tasks total, with 3-5 items each.

      Strict formatting rules (do not violate):
      - Return only a single JSON object that validates tasksSchema; no prose or markdown.
      - Do not add extra fields beyond the schema.
      - Never emit empty arrays; include at least one task with 3-5 items.
      - If unsure, choose sensible defaults but keep the response valid JSON for tasksSchema.`,
      onFinish: async (event) => {
        if (!supabaseClient || !conversationId) {
          return;
        }

        try {
          const assistantId = `agent-assistant-${randomUUID()}`;

          if (event.error) {
            const errorMessage = createAssistantMessage(assistantId, {
              text: "Agent run failed to produce a response.",
              metadata: {
                agentRun: {
                  error: serializeError(event.error),
                },
              },
            });

            await persistConversationMessage({
              supabase: supabaseClient,
              conversationId,
              message: errorMessage,
              fallbackContent: "Agent run failed to produce a response.",
            });
            return;
          }

          if (!event.object) {
            return;
          }

          const formatted = formatAgentTasks(event.object as AgentTaskResult);

          const assistantMessage = createAssistantMessage(assistantId, {
            text: formatted,
            metadata: {
              agentRun: {
                tasks: event.object,
              },
            },
          });

          await persistConversationMessage({
            supabase: supabaseClient,
            conversationId,
            message: assistantMessage,
            fallbackContent: formatted,
          });
        } catch (error) {
          logger.error("[agent] failed to persist agent response", error);
        }
      },
    });

    const responseInit: ResponseInit = conversationId
      ? { headers: { "x-conversation-id": conversationId } }
      : {};

    recordAiTelemetry({
      model: "openai/gpt-5.4",
      tools: [],
      orgId: auth.orgId,
      userId: auth.session?.user.id ?? null,
      conversationId,
      latencyMs: Date.now() - startedAt,
      modelRoute: "agent",
      success: true,
    });

    return result.toTextStreamResponse(responseInit);
  } catch (error) {
    return createErrorResponse(error);
  }
}

function createAssistantMessage(
  id: string,
  options: { text: string; metadata?: Record<string, UntypedJson> },
): UIMessage {
  return {
    id,
    role: "assistant",
    parts: [
      {
        type: "text",
        text: options.text,
      },
    ],
    metadata: options.metadata,
  };
}

function serializeError(error: UntypedJson): { message: string } {
  if (!error) {
    return { message: "Unknown error" };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: "Unknown error" };
  }
}

function formatAgentTasks(result: AgentTaskResult): string {
  if (!result || !Array.isArray(result.tasks) || result.tasks.length === 0) {
    return "Agent run completed.";
  }

  return result.tasks
    .map((task) => {
      const header = task?.title?.trim() ? `### ${task.title.trim()}` : "### Task";
      const body = Array.isArray(task?.items)
        ? task.items
          .map((item) => formatTaskItem(item))
          .filter((line) => Boolean(line?.trim()))
          .join("\n")
        : "";

      return body ? `${header}\n${body}` : header;
    })
    .join("\n\n")
    .trim();
}

function formatTaskItem(item: TaskItem | undefined): string {
  if (!item || typeof item.content !== "string" || !item.content.trim()) {
    return "";
  }

  const statusLabel = statusToLabel[item.status] ?? "Pending";
  const fileSuffix = item.type === "file" && item.file?.name ? ` _(file: ${item.file.name})_` : "";

  return `- **${statusLabel}:** ${item.content.trim()}${fileSuffix}`;
}

const statusToLabel: Record<TaskItem["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};
