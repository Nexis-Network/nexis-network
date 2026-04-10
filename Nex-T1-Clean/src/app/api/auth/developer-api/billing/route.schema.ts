import { z } from "zod";

export const developerApiBillingQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
});
