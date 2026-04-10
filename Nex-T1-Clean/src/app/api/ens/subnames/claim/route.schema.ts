import { z } from "zod";

export const PrepareEnsClaimSchema = z.object({
  label: z.string().trim().min(1).max(64),
});
