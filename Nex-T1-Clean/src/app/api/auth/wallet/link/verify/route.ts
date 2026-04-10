import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import {
  verifyWalletLink,
  WalletRateLimitError,
  WalletRequestError,
} from "@/server/auth/wallet";
import { normalizeWalletAddress, type SupportedChain } from "@/server/wallets/utils";

export async function POST(request: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);

  try {
    const { context } = await resolveSupabaseContext(cookieBridge, { refreshSession: false });
    if (!context) {
      return cookieBridge.commit(apiResponse.unauthorized("Not signed in"));
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return cookieBridge.commit(apiResponse.badRequest("Request body must include wallet verification payload."));
    const data = body as Record<string, UntypedJson>;

    const chainInput = String(data.chain || "");
    const address = String(data.address || "");
    const nonce = String(data.nonce || "");
    const signature = String(data.signature || "");
    const signatureEncodingRaw = data.signature_encoding;
    const signatureEncoding = typeof signatureEncodingRaw === 'string' && signatureEncodingRaw ? signatureEncodingRaw : (chainInput === "solana" ? "base58" : undefined);

    if (!chainInput || !address || !nonce || !signature) {
      return cookieBridge.commit(apiResponse.badRequest("Missing required parameters"));
    }

    if (chainInput !== "evm" && chainInput !== "solana") {
      return cookieBridge.commit(apiResponse.badRequest("Unsupported chain"));
    }

    const chain = chainInput as SupportedChain;
    const normalizedAddress = normalizeWalletAddress(chain, address);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const result = await verifyWalletLink({
      chain,
      address,
      nonce,
      signature,
      signatureEncoding,
      rateLimitKey: `${ip}:${normalizedAddress}`,
      supabaseUid: context.userId,
    });

    return cookieBridge.commit(
      apiResponse.success({
        success: true,
        chain: result.chain,
        address: result.address,
        normalized_address: result.normalizedAddress,
        nonce: result.nonce,
      }),
    );
  } catch (error) {
    if (error instanceof WalletRateLimitError) {
      const res = apiResponse.error("WALLET_RATE_LIMIT", error.message, 429);
      if (error.headers) {
         Object.entries(error.headers).forEach(([k, v]) => {
           if (v) res.headers.set(k, v.toString());
         });
      }
      return cookieBridge.commit(res);
    }
    if (error instanceof WalletRequestError) {
      return cookieBridge.commit(apiResponse.error("WALLET_REQUEST_ERROR", error.message, error.status));
    }
    return cookieBridge.commit(
      apiResponse.internalError(error instanceof Error ? error.message : "Failed to verify wallet link signature"),
    );
  }
}
