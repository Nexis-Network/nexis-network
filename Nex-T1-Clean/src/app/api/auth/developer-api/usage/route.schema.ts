import { z } from "zod";

export const developerApiUsageQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
});
