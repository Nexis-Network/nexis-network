import { z } from "zod";

export const chatCompletionsSchema = z.object({
  model: z.enum(["nex-t1", "nex-t1-instant", "nex-1-code"]).default("nex-t1"),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().trim().min(1),
      }),
    )
    .min(1),
  max_tokens: z.number().int().min(1).max(4_096).optional(),
  temperature: z.number().min(0).max(2).optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

export type ChatCompletionsInput = z.infer<typeof chatCompletionsSchema>;
