"use server";

import { openai } from "@/server/services/ai-sdk/openai";
import { generateText } from "ai";
import { headers } from "next/headers";
import { checkRateLimit } from "@/server/security/rate-limit-lite";
import { parallelProcessingSchema } from "@/lib/schema";
import type { TaskResult } from "@/lib/schema";


import { logger } from '@/lib/logger';
export type SearchResult = {
  text: string;
  sources?: Array<{ url: string; title: string }>;
  error?: { message: string };
};

export async function searchWeb(query: string): Promise<SearchResult> {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    const identifier = `search-web-${ip}`;
    const { success } = await checkRateLimit(identifier);

    if (!success) {
      return {
        text: "",
        error: { message: "Rate limit exceeded. Please try again later." },
      };
    }

    const { text } = await generateText({
      model: openai(process.env.NEX_BALANCED_MODEL ?? "gpt-5-chat-latest"),
      system: "You are a helpful search assistant. Provide concise, accurate answers.",
      prompt: query,
    });

    return { text, sources: [] };
  } catch (error) {
    return {
      text: "",
      error: {
        message: error instanceof Error ? error.message : "Search failed",
      },
    };
  }
}

/**
 * Business Feature Analysis Server Action
 *
 * Implements concurrent feature analysis from business team perspectives:
 * - Marketing: Focus on user acquisition, positioning, and market appeal
 * - Product: Focus on user experience, feature value, and product strategy
 * - Technical: Focus on implementation complexity, architecture, and feasibility
 *
 * @param content - Feature description to analyze
 * @returns Object with success status, error message (if any), and data
 */
export async function parallelProcessing(content: string) {
  try {
    // Rate limiting
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    const identifier = `ai-agents-parallel-processing-${ip}`;
    const { success } = await checkRateLimit(identifier);

    if (!success) {
      return {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        data: null,
      };
    }

    const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    // Configure business team analysis tasks
    const tasks = [
      {
        name: "Marketing",
        prompt: `As a marketing team member, analyze this feature from a marketing perspective. Focus on:
- Target audience and user acquisition potential
- Market positioning and competitive advantages
- Marketing messaging and value proposition
- Go-to-market strategy and launch considerations
- User engagement and retention potential`,
        icon: "megaphone",
        color: "blue",
      },
      {
        name: "Product",
        prompt: `As a product manager, analyze this feature from a product perspective. Focus on:
- User experience and usability considerations
- Feature value and user benefit
- Product strategy alignment and roadmap fit
- User journey and workflow integration
- Success metrics and KPIs`,
        icon: "target",
        color: "green",
      },
      {
        name: "Technical",
        prompt: `As a technical lead, analyze this feature from a technical perspective. Focus on:
- Implementation complexity and technical feasibility
- Architecture and system design considerations
- Performance and scalability implications
- Security and compliance requirements
- Development timeline and resource needs`,
        icon: "code",
        color: "purple",
      },
    ];

    // Execute all analysis tasks concurrently
    const results = await Promise.all(
      tasks.map(async (task) => {
        const { text, usage } = await generateText({
          model: openai(process.env.NEX_BALANCED_MODEL ?? "gpt-5-chat-latest"),
          system: `You are performing the "${task.name}" task. Focus on providing clear, concise, and insightful analysis from this perspective.`,
          prompt: `${task.prompt}\n\n${content}`,
        });

        if (usage) {
          totalUsage.inputTokens += usage?.inputTokens ?? 0;
          totalUsage.outputTokens += usage?.outputTokens ?? 0;
          totalUsage.totalTokens += usage?.totalTokens ?? 0;
        }

        return {
          task: task.name,
          result: text,
          icon: task.icon,
          color: task.color,
        };
      })
    );

    const result = {
      results,
      metadata: {
        inputLength: content.length,
        processedAt: new Date().toISOString(),
        workers: tasks.length,
        perspectives: ["marketing", "product", "technical"],
      },
      usage: totalUsage,
    };

    // Validate the result against the schema
    const validatedResult = parallelProcessingSchema.parse(result);

    return {
      success: true,
      error: null,
      data: validatedResult,
    };
  } catch (error) {
    logger.error("Error in parallelProcessing action:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process content in parallel",
      data: null,
    };
  }
}

type ListTasksParams = {
  limit?: number;
  offset?: number;
};

type ListTasksResult = {
  tasks: TaskResult[];
  hasMore: boolean;
};

export async function listTasks(params: ListTasksParams): Promise<ListTasksResult> {
  const searchParams = new URLSearchParams();
  if (typeof params.limit === "number") {
    searchParams.set("limit", params.limit.toString());
  }
  if (typeof params.offset === "number") {
    searchParams.set("offset", params.offset.toString());
  }

  const query = searchParams.toString();
  const endpoint = query.length > 0 ? `/api/nex/tasks/history?${query}` : "/api/nex/tasks/history";

  // Node.js fetch requires an absolute URL. When running on the server,
  // construct one from public env vars; in the browser, a relative URL is fine.
  const toAbsolute = (path: string) => {
    if (typeof window !== "undefined") return path;
    const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
    const base = explicit || vercel || "http://localhost:3000";
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  };

  try {
    const response = await fetch(toAbsolute(endpoint), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to list tasks: ${response.status}`);
    }

    const data = (await response.json().catch(() => ({}))) as {
      tasks?: TaskResult[];
      hasMore?: boolean;
    };

    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      hasMore: Boolean(data.hasMore),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("list_tasks_failed", error);
    }
    return { tasks: [], hasMore: false };
  }
}
