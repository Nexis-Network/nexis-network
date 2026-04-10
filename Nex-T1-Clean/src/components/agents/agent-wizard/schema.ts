import { z } from "zod";

const listingSchema = z.object({
  listingType: z.enum(["sale", "rent", "usage"]),
  networkId: z.string().min(3),
  assetId: z.string().optional(),
  priceBaseUnits: z.string().regex(/^\d+$/, "Must be a numeric string"),
  currencySymbol: z.string().optional(),
  currencyDecimals: z.number().int().nonnegative(),
});

const imageSchema = z.object({
  path: z.string().min(1),
  url: z.string().url().optional(),
});

export const wizardSchema = z.object({
  orgId: z
    .string()
    .uuid({ message: "Workspace is invalid" })
    .nullish(),
  slug: z.string().min(3).max(48),
  name: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private", "unlisted"]),
  systemPrompt: z.string().max(4000).optional(),
  modelId: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(256).max(32000),
  tools: z.array(
    z.object({
      id: z.string(),
      enabled: z.boolean(),
      config: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  secrets: z.array(
    z.object({
      keyName: z.string().min(1, "Enter a key name"),
      envelope: z.string().min(16, "Envelope must be encrypted"),
    }),
  ),
  pricing: z.array(listingSchema),
  avatar: imageSchema.nullish(),
  banner: imageSchema.nullish(),
});

export type AgentWizardValues = z.infer<typeof wizardSchema>;
