import { z } from "zod";

export const NotificationChannelSchema = z.enum(["in_app", "email", "webhook"]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

const DexVenueSchema = z.enum([
  "0x",
  "uniswap",
  "pancakeswap",
  "jupiter",
  "pumpfun",
  "pumpdotfun",
  "pumpswap",
  "binance",
]);
export type DexVenue = z.infer<typeof DexVenueSchema>;

export const DexTradeActionSchema = z.object({
  type: z.literal("dex_trade"),
  venue: DexVenueSchema.default("0x"),
  chainId: z.number().int().positive().default(1),
  side: z.enum(["buy", "sell"]),
  baseToken: z.string().min(2, "Base token is required"),
  quoteToken: z.string().min(1, "Quote token is required").default("USDC"),
  amountMode: z.enum(["sell", "buy"]).default("sell"),
  amount: z.string().min(1, "Amount is required"),
  slippageBps: z.number().int().min(5).max(5000).default(50),
  takerAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/u, { message: "Provide a valid EVM address" })
    .optional(),
  executionMode: z.enum(["simulate", "execute"]).default("simulate"),
  allowPartialFill: z.boolean().default(false),
});

export const NewsDigestActionSchema = z.object({
  type: z.literal("news_digest"),
  topic: z.string().min(2, "Enter a topic or keyword"),
  limit: z.number().int().min(3).max(25).default(6),
  deliver: z.array(NotificationChannelSchema).nonempty("Select at least one delivery channel"),
  email: z.string().email().optional(),
  includeComments: z.boolean().default(false),
});

export const TaskActionSchema = z.discriminatedUnion("type", [DexTradeActionSchema, NewsDigestActionSchema]);
export type TaskActionInput = z.infer<typeof TaskActionSchema>;

export function parseTaskAction(input: UntypedJson): TaskActionInput {
  return TaskActionSchema.parse(input);
}

export function getDefaultTaskAction(): TaskActionInput {
  return {
    type: "news_digest",
    topic: "daily crypto highlights",
    limit: 6,
    deliver: ["in_app"],
    includeComments: false,
  };
}

