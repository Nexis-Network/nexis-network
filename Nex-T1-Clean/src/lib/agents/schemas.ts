import { z } from "zod";

export const AgentVisibilitySchema = z.enum(["public", "private", "unlisted"]);

export const AgentListingTypeSchema = z.enum(["sale", "rent", "usage"]);

export const AgentListingSummarySchema = z.object({
  listing_id: z.string().uuid(),
  listing_type: AgentListingTypeSchema,
  network_id: z.string(),
  asset_id: z.string().nullable(),
  price_base_units: z.string(),
  currency_symbol: z.string().nullable(),
  currency_decimals: z.number().int().nonnegative(),
});

export const AgentStrategySnapshotSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().nullable().optional(),
  blockly_xml: z.string(),
  summary: z.record(z.string(), z.unknown()),
  workflow: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});

export const AgentListItemSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: AgentVisibilitySchema,
  created_at: z.string(),
  updated_at: z.string().nullable(),
  owner_user_id: z.string().uuid().nullable().optional(),
  listing_summary: z.array(AgentListingSummarySchema).optional(),
  realized_pnl_usd: z.union([z.string(), z.number()]).nullable().optional(),
  volume_usd: z.union([z.string(), z.number()]).nullable().optional(),
  win_rate_percent: z.union([z.string(), z.number()]).nullable().optional(),
  average_return_percent: z.union([z.string(), z.number()]).nullable().optional(),
  total_trades: z.union([z.string(), z.number()]).nullable().optional(),
  wins: z.union([z.string(), z.number()]).nullable().optional(),
  losses: z.union([z.string(), z.number()]).nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  supply: z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "number" ? value : Number(value)))
    .refine((value) => Number.isFinite(value) && Number.isInteger(value) && value >= 0, "supply must be a nonnegative integer"),
  num_owners: z
    .union([z.number(), z.string()])
    .transform((value) => (typeof value === "number" ? value : Number(value)))
    .refine((value) => Number.isFinite(value) && Number.isInteger(value) && value >= 0, "num_owners must be a nonnegative integer"),
});

export const AgentVersionSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  checksum: z.string(),
  created_at: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const AgentDeploymentSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  version_id: z.string().uuid(),
  tee_provider: z.string(),
  container_id: z.string().nullable(),
  endpoint_url: z.string().nullable(),
  status: z.string(),
  status_reason: z.string().nullable(),
  attestation: z.unknown().nullable(),
  attestation_hash: z.string().nullable(),
  last_heartbeat: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
});

export const AgentDetailSchema = z.object({
  ok: z.literal(true),
  agent: AgentListItemSchema.extend({
    system_prompt: z.string().nullable(),
    strategy_snapshot: AgentStrategySnapshotSchema.optional(),
  }),
  versions: z.array(AgentVersionSchema),
  deployments: z.array(AgentDeploymentSchema),
  listings: z.array(AgentListingSummarySchema).optional(),
});

export const AgentListResponseSchema = z.object({
  ok: z.literal(true),
  items: z.array(AgentListItemSchema),
  next_cursor: z.string().optional(),
});

export type AgentListItemRaw = z.infer<typeof AgentListItemSchema>;
export type AgentListingSummaryRaw = z.infer<typeof AgentListingSummarySchema>;
export type AgentDetailResponseRaw = z.infer<typeof AgentDetailSchema>;
export type AgentStrategySnapshotRaw = z.infer<typeof AgentStrategySnapshotSchema>;
