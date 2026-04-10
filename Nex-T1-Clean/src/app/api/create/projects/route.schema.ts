import { z } from "zod";

const CREATE_TEMPLATE_IDS = ["wagmi-evm", "web3js-evm", "solana-web3js"] as const;

export const createProjectRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(12_000),
  stream: z.boolean().optional().default(true),
  templateId: z.enum(CREATE_TEMPLATE_IDS),
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
