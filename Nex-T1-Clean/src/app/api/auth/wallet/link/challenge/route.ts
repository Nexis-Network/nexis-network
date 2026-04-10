import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { issueWalletChallenge, WalletRequestError } from "@/server/auth/wallet";
import { type SupportedChain } from "@/server/wallets/utils";

export async function POST(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
    if (!context) {
      return cookieBridge.commit(apiResponse.unauthorized("Not signed in"));
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return cookieBridge.commit(apiResponse.badRequest("Request body must include chain and address."));
    const data = body as Record<string, UntypedJson>;

    const chainInput = String(data.chain || "");
    const address = String(data.address || "");
    const chainId = data.chain_id ?? data.chainId ?? data.chainID;
    const chainNamespaceRaw = data.chain_namespace ?? data.chainNamespace ?? data.namespace;
    const chainNamespace = typeof chainNamespaceRaw === 'string' ? chainNamespaceRaw : undefined;

    if (!chainInput || !address) {
      return cookieBridge.commit(apiResponse.badRequest("Missing required chain or address"));
    }

    if (chainInput !== "evm" && chainInput !== "solana") {
      return cookieBridge.commit(apiResponse.badRequest("Unsupported chain"));
    }

    const challenge = await issueWalletChallenge({
      purpose: "link",
      chain: chainInput as SupportedChain,
      address,
      chainId: typeof chainId === 'number' ? chainId : undefined,
      chainNamespace,
      supabaseUid: context.userId,
    });

    return cookieBridge.commit(
      apiResponse.success({
        nonce: challenge.nonce,
        message: challenge.message,
        expires_at: challenge.expiresAt,
        chain: challenge.chain,
        chain_id: challenge.chainId,
        chain_namespace: challenge.chainNamespace,
        created_at: challenge.createdAt,
      }),
    );
  } catch (error) {
    if (error instanceof WalletRequestError) {
      return cookieBridge.commit(apiResponse.error("WALLET_REQUEST_ERROR", error.message, error.status));
    }
    return cookieBridge.commit(
      apiResponse.internalError(error instanceof Error ? error.message : "Failed to request wallet link challenge"),
    );
  }
}
