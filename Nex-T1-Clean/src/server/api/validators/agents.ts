import { z } from "zod";

export const invokeAgentRequestSchema = z
  .object({
    deploymentId: z.string().uuid().optional(),
    toolMode: z.enum(["readonly", "trading"]).default("readonly"),
    prompt: z.string().min(1).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string().min(1),
        }),
      )
      .optional(),
  })
  .refine((value) => Boolean(value.prompt?.trim()) || (Array.isArray(value.messages) && value.messages.length > 0), {
    message: "prompt or messages is required",
  });

export type InvokeAgentRequest = z.infer<typeof invokeAgentRequestSchema>;
