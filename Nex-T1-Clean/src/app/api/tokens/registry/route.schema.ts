import { z } from "zod";

const booleanSearchParam = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

export const tokenRegistryQuerySchema = z.object({
  chainId: z.coerce.number().int().positive().optional(),
  search: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .optional(),
  includeUnsupported: booleanSearchParam,
  includeBroken: booleanSearchParam,
  includeBanned: booleanSearchParam,
});

export type TokenRegistryRouteQuery = z.infer<typeof tokenRegistryQuerySchema>;

export function parseTokenRegistryQuery(searchParams: URLSearchParams): TokenRegistryRouteQuery {
  return tokenRegistryQuerySchema.parse({
    chainId: searchParams.get("chainId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    includeUnsupported: searchParams.get("includeUnsupported") ?? undefined,
    includeBroken: searchParams.get("includeBroken") ?? undefined,
    includeBanned: searchParams.get("includeBanned") ?? undefined,
  });
}
