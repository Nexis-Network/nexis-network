import { createNexProxyHandlers, forwardNexProxy } from "@/server/api/helpers/nex-proxy";
import type { HttpMethod } from "@/server/api/nex-client";


async function forward(
  request: Request,
  method: HttpMethod,
  context: { params?: Promise<{ path?: string[] }> },
) {
  return forwardNexProxy(request, method, context, {
    pathPrefix: "/api/v1/wallets",
    timeoutMs: 15000,
    errorMessage: "Wallet proxy request failed",
    requireOrg: false,
  });
}

const handlers = createNexProxyHandlers(forward);

export const { GET, POST, DELETE, PATCH, PUT } = handlers;
