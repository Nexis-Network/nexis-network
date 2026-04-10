import { NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse, validateBody } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";

const LayerEnum = z.enum(["L1", "L2", "alt"]);
const ProviderEnum = z.enum(["walletconnect_external", "nex_in_app"]);
const TransactionKindEnum = z.enum([
  "sign_message",
  "sign_typed_data",
  "approve_erc20",
  "send_native",
  "send_token",
  "bridge",
  "swap",
]);

const ChainSchema = z.object({
  chainId: z.number().int(),
  network: z.string().min(1),
  layer: LayerEnum,
});

const AutomatedModeSchema = z.object({
  kind: z.literal("automated"),
  agentId: z.string().min(1),
  auditTrailId: z.string().min(1).optional(),
});

const ManualModeSchema = z.object({
  kind: z.literal("manual"),
  approverUserId: z.string().min(1),
  approvalId: z.string().min(1),
});

const ModeSchema = z.discriminatedUnion("kind", [AutomatedModeSchema, ManualModeSchema]);

const SignatureSchema = z.object({
  type: z.enum(["signMessage", "signTypedData"]),
  payload: z.union([z.string(), z.record(z.string(), z.unknown())]),
});

const ApprovalSchema = z.object({
  spender: z.string().min(1),
  token: z.string().min(1),
  amount: z.string().min(1),
});

const TransferTargetSchema = z.object({
  address: z.string().min(1),
  amount: z.string().min(1),
});

const TransferSchema = z.object({
  type: z.enum(["native", "erc20"]),
  amount: z.string().min(1),
  tokenAddress: z.string().min(1).optional(),
  to: z.array(TransferTargetSchema).min(1),
});

const BridgeSchema = z.object({
  destinationChainId: z.number().int(),
  destinationAddress: z.string().min(1),
  router: z.enum(["wormhole", "relay", "celer", "layerzero"]),
  slippageBps: z.number().int().min(0).max(10_000).optional(),
});

const SwapSchema = z.object({
  protocol: z.enum(["uniswap", "pancakeswap", "jupiter"]),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.string().min(1),
  minAmountOut: z.string().min(1),
  slippageBps: z.number().int().min(0).max(10_000).optional(),
});

const IntentRequestSchema = z.object({
  provider: ProviderEnum,
  chain: ChainSchema,
  fromAddress: z.string().min(1),
  kind: TransactionKindEnum,
  mode: ModeSchema.optional(),
  signature: SignatureSchema.optional(),
  approval: ApprovalSchema.optional(),
  transfer: TransferSchema.optional(),
  bridge: BridgeSchema.optional(),
  swap: SwapSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type IntentRequest = z.infer<typeof IntentRequestSchema>;

const WALLET_EXECUTION_DISABLED_MESSAGE =
  "Wallet execution is disabled in this build. Use preview-only flows until centralized approval is available.";

const ensureBridgePayload = (payload: IntentRequest) => {
  if (!payload.bridge) {
    throw new Error("Bridge metadata is required for bridge intents.");
  }
  if (!payload.transfer) {
    throw new Error("Transfer metadata is required for bridge intents.");
  }
};

const ensureSwapPayload = (payload: IntentRequest) => {
  if (!payload.swap) {
    throw new Error("Swap metadata is required for swap intents.");
  }
};

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, { allowPublic: false });
  if (!auth.ok) return auth.response;

  const validation = await validateBody(request, IntentRequestSchema);
  if (!validation.success) return validation.response;

  const intentPayload = validation.data;

  try {
    if (intentPayload.kind === "bridge") {
      ensureBridgePayload(intentPayload);
    } else if (intentPayload.kind === "swap") {
      ensureSwapPayload(intentPayload);
    }
  } catch (error) {
    return apiResponse.badRequest(error instanceof Error ? error.message : "Invalid wallet intent");
  }

  return apiResponse.error(
    "WALLET_EXECUTION_DISABLED",
    WALLET_EXECUTION_DISABLED_MESSAGE,
    403,
    {
      kind: intentPayload.kind,
      provider: intentPayload.provider,
    },
  );
}
