import { resolveTokenByAddress } from "@/modules/tokens/server/token-resolve-service";
import type { TokenResolveRouteQuery } from "@/app/api/tokens/resolve/route.schema";

export function getResolvedTokenRouteData(query: TokenResolveRouteQuery) {
  return resolveTokenByAddress(query);
}
