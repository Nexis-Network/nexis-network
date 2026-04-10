import { generateObject, gateway } from "ai";
import { z } from "zod";

export const SocialWorker = {
  execute: async (params: {
    taskId: string;
    description: string;
    context?: string;
    requirements?: string[];
    priority: string;
  }) => {
    const { object: result } = await generateObject({
      model: gateway("openai/gpt-4.1-mini"),
      schema: z.object({
        output: z.string(),
        explanation: z.string(),
        sentiment: z.enum(["positive", "negative", "neutral", "euphoric", "panic"]),
        narratives: z.array(z.string()).optional(),
        keyOpinionLeaders: z.array(z.string()).optional(),
        engagementMetrics: z.object({
          likes: z.number().optional(),
          retweets: z.number().optional(),
          replies: z.number().optional(),
        }).optional(),
      }),
      system: `You are a specialized Social Sentiment Analyst.
      Your goal is to analyze crypto narratives and sentiment on X.com (Twitter).
      Focus on KOL mentions, community sentiment, and emerging narratives.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Analyze the social sentiment.`,
      prompt: "Analyze the social sentiment and narratives.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
