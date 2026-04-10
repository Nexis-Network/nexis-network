import { z } from "zod";

export const createApiProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  ownerType: z.enum(["user", "organization"]).default("user"),
  organizationId: z.string().uuid().optional(),
  hardCapUsd: z.number().min(0).max(1_000_000).optional(),
  softCapUsd: z.number().min(0).max(1_000_000).optional(),
  overageEnabled: z.boolean().optional(),
});
