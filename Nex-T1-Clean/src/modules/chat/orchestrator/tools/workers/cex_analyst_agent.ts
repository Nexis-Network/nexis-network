import { generateObject, gateway } from "ai";
import { z } from "zod";

export const CexAnalystWorker = {
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
        marketData: z.object({
          pair: z.string().optional(),
          price: z.number().optional(),
          volume24h: z.number().optional(),
          orderBookSummary: z.string().optional(),
          fundingRate: z.number().optional(), // Relevant for perps on CEXs
        }).optional(),
        exchangeSpecifics: z.object({
          name: z.string(),
          status: z.enum(["active", "maintenance", "delisted"]).optional(),
          listingDate: z.string().optional(),
        }).optional(),
        action: z.enum(["buy", "sell", "hold", "transfer_out", "deposit"]).optional(),
      }),
      system: `You are a specialized CEX (Centralized Exchange) Analyst.
      Your goal is to analyze trading pairs, order books, and token listings on major exchanges: Binance, Coinbase, OKX, Bybit, and Kraken.
      Focus on price, volume, funding rates (for derivatives), and specific exchange attributes.
      
      Task: ${params.description}
      Context: ${params.context || "None"}
      Requirements: ${params.requirements?.join(", ") || "None"}
      
      Provide a professional exchange analysis.`,
      prompt: "Analyze the CEX market data.",
    });

    return {
      taskId: params.taskId,
      status: "completed" as const,
      ...result,
    };
  },
};
