import { z } from "zod";

export const conversationIdParamsSchema = z.object({
  id: z.string().min(1, "conversation id is required"),
});

export const conversationSummariesQuerySchema = z.object({
  limit: z.coerce.number().int().min(5).max(200).default(20),
  offset: z.coerce.number().int().min(0).max(5000).default(0),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type ConversationSummariesQuery = z.infer<typeof conversationSummariesQuerySchema>;
