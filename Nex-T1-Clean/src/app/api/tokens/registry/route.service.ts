import type { TokenRegistryQuery } from "@/modules/tokens/types";
import { getTokenRegistrySnapshot } from "@/modules/tokens/server/registry-service";

export async function getTokenRegistryRouteData(query: TokenRegistryQuery) {
  return getTokenRegistrySnapshot(query);
}
