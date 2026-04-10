import { z } from "zod";

export const rewardIdentityBodySchema = z.object({
  deviceId: z.string().trim().min(1).max(256).optional().nullable(),
});

export type RewardIdentityBody = z.infer<typeof rewardIdentityBodySchema>;
