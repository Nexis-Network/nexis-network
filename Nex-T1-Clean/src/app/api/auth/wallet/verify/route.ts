import { apiResponse } from "@/lib/api-platform";
import { extractClientIP } from "@/lib/request-utils";
import {
  verifyWalletLogin,
  WalletRateLimitError,
  WalletRequestError,
} from "@/server/auth/wallet";
import { normalizeWalletAddress, type SupportedChain } from "@/server/wallets/utils";

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return apiResponse.badRequest("Request body must be a JSON object.");
    }

    const chain = String((payload as Record<string, UntypedJson>).chain || "");
    const address = String((payload as Record<string, UntypedJson>).address || "");
    const nonce = String((payload as Record<string, UntypedJson>).nonce || "");
    const signature = String((payload as Record<string, UntypedJson>).signature || "");

    if (!chain || !address || !nonce || !signature) {
      return apiResponse.badRequest("Missing required parameters");
    }

    if (chain !== "evm" && chain !== "solana") {
      return apiResponse.badRequest("Unsupported chain");
    }

    const walletChain = chain as SupportedChain;
    const normalizedAddress = normalizeWalletAddress(walletChain, address);
    
    // START_RESTORED
    const ip = extractClientIP(req);
    // END_RESTORED

    const signatureEncodingRaw = (payload as Record<string, UntypedJson>).signature_encoding;
    const signatureEncoding = typeof signatureEncodingRaw === 'string' && signatureEncodingRaw ? signatureEncodingRaw : (walletChain === "solana" ? "base58" : undefined);

    const result = await verifyWalletLogin({
      chain: walletChain,
      address,
      nonce,
      signature,
      signatureEncoding,
      rateLimitKey: `${ip}:${normalizedAddress}`,
    });

    return apiResponse.success({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
      expires_in: result.session.expires_in,
      token_type: result.session.token_type,
      user: result.user,
      session: result.session,
    });
  } catch (error) {
    if (error instanceof WalletRateLimitError) {
      const res = apiResponse.error("WALLET_RATE_LIMIT", error.message, 429);
      if (error.headers) {
        Object.entries(error.headers).forEach(([k, v]) => {
           if (v) res.headers.set(k, v.toString());
        });
      }
      return res;
    }
    if (error instanceof WalletRequestError) {
      return apiResponse.error("WALLET_REQUEST_ERROR", error.message, error.status);
    }
    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to verify wallet signature");
  }
}
