import { z } from "zod";

export const developerResponseSchema = z.object({
  model: z.enum(["nex-t1", "nex-t1-instant", "nex-1-code"]),
  input: z.string().trim().min(1),
  instructions: z.string().trim().min(1).optional(),
  maxOutputTokens: z.number().int().min(1).max(4_096).optional(),
  temperature: z.number().min(0).max(2).optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  tools: z
    .object({
      enabled: z.boolean().optional(),
      allow: z.array(z.string()).min(1).optional(),
    })
    .optional(),
});

export const pinnedDeveloperResponseSchema = developerResponseSchema.omit({
  model: true,
});

export type DeveloperResponseInput = z.infer<typeof developerResponseSchema>;
export type PinnedDeveloperResponseInput = z.infer<
  typeof pinnedDeveloperResponseSchema
>;
