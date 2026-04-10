import { z } from "zod";

export const createMessageRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(12_000),
  stream: z.boolean().optional().default(true),
});
