import { z } from "zod";

export const tokenResolveQuerySchema = z.object({
  chainId: z.coerce.number().int().positive(),
  address: z.string().trim().min(1).max(80),
});

export type TokenResolveRouteQuery = z.infer<typeof tokenResolveQuerySchema>;

export function parseTokenResolveQuery(searchParams: URLSearchParams): TokenResolveRouteQuery {
  return tokenResolveQuerySchema.parse({
    chainId: searchParams.get("chainId"),
    address: searchParams.get("address"),
  });
}
