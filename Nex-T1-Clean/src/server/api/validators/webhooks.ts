import { z } from "zod";

export const taskWebhookBodySchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
});

export const taskWebhookSignatureSchema = z.object({
  timestamp: z.number().finite(),
  signature: z.string().regex(/^[a-f0-9]+$/i, "signature must be hex"),
});

export type TaskWebhookBody = z.infer<typeof taskWebhookBodySchema>;
