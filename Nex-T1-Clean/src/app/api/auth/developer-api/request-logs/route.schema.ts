import { z } from "zod";

export const developerApiRequestLogsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
