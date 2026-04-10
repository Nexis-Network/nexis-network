import { z } from "zod";

const cdpWalletBalanceParamsSchema = z.object({
  address: z.string().min(1, "Wallet address is required"),
});

const cdpWalletBalanceQuerySchema = z.object({
  platform: z.enum(["evm", "solana"]),
  chainId: z.string().optional(),
});

export function parseCdpWalletBalanceRequest(input: {
  address: string;
  requestUrl: string;
}) {
  const url = new URL(input.requestUrl);

  return z
    .object({
      params: cdpWalletBalanceParamsSchema,
      query: cdpWalletBalanceQuerySchema,
    })
    .safeParse({
      params: { address: input.address },
      query: {
        platform: url.searchParams.get("platform"),
        chainId: url.searchParams.get("chainId") ?? undefined,
      },
    });
}

