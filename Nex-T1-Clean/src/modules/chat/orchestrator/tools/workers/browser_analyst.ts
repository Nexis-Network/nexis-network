import { generateObject, gateway } from "ai";
import { z } from "zod";

export const BrowserAnalystWorker = {
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
        extractedData: z.record(z.any()).optional(),
        pageInsights: z.array(z.string()).optional(),
        deliverables: z.array(z.object({
          name: z.string(),
          type: z.enum(["analysis", "data_extraction", "summary"]),
          content: z.string(),
          status: z.enum(["completed"]),
        })).optional(),
      }),
      system: `You are a specialized Browser Analyst.
      Your goal is to analyze the content of the user's active web page to extract insights, data, or context.
      Use the provided page context (DOM content, title, URL) to answer the task.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Analyze the page content.`,
      prompt: "Analyze the browser context and provide insights.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
