import { getExternalTokenListSnapshot } from "@/modules/tokens/server/external-token-list-service";

export async function getTokenListRouteData() {
  return getExternalTokenListSnapshot();
}
