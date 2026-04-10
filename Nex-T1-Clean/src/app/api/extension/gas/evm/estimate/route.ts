import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { z } from "zod";


const BodySchema = z.object({
  chainId: z.number().optional(),
  from: z.string().startsWith("0x"),
  to: z.string().startsWith("0x"),
  value: z.string().optional(),
  data: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const json = await request.json().catch(() => ({}));
    const body = BodySchema.safeParse(json);

    if (!body.success) {
      return apiResponse.error("invalid_request", body.error.message, 400);
    }

    const { chainId, from, to, value, data } = body.data;

    // Default to mainnet if no chainId provided, or use a map for other chains
    // fast-follow: support more chains via a config map
    const client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    const gasEstimate = await client.estimateGas({
      account: from as `0x${string}`,
      to: to as `0x${string}`,
      value: value ? BigInt(value) : undefined,
      data: data as `0x${string}`,
    });

    return apiResponse.success({
      gasLimit: gasEstimate.toString(),
      chainId: chainId ?? 1,
    });
  } catch (error) {
    console.error("[Gas Estimate] Error:", error);
    return apiResponse.internalError("Failed to estimate gas");
  }
}
