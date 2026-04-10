import { apiResponse } from "@/lib/api-platform";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

type LinkWalletPayload = {
  address: UntypedJson;
  chain: UntypedJson;
  wallet_type?: UntypedJson;
  label?: UntypedJson;
  capabilities?: UntypedJson;
};

const DEFAULT_WALLET_TYPE = "external_evm";

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    if (!client) {
      return apiResponse.serviceUnavailable("Supabase is not configured");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return apiResponse.badRequest("Wallet link payload must be a JSON object.");

    const payload = body as LinkWalletPayload;
    const address = typeof payload.address === "string" ? payload.address.trim() : "";
    const chain = typeof payload.chain === "string" ? payload.chain.trim() : "";
    const normalizedChain = chain.toLowerCase();
    const rawWalletType =
      typeof payload.wallet_type === "string" && payload.wallet_type.trim().length > 0
        ? payload.wallet_type.trim()
        : DEFAULT_WALLET_TYPE;
    const walletType =
      rawWalletType === "identity"
        ? normalizedChain === "solana"
          ? "external_solana"
          : DEFAULT_WALLET_TYPE
        : rawWalletType;
    const label = typeof payload.label === "string" ? payload.label.trim() : null;
    const capabilities =
      payload.capabilities && typeof payload.capabilities === "object" && !Array.isArray(payload.capabilities)
        ? (payload.capabilities as Record<string, UntypedJson>)
        : {};
    const chainIdRaw = (payload as Record<string, UntypedJson>).chain_id ?? (payload as Record<string, UntypedJson>).chainId;
    const chainId = typeof chainIdRaw === 'number' ? chainIdRaw : (typeof chainIdRaw === 'string' ? parseInt(chainIdRaw, 10) : undefined);

    if (!address || !chain) {
      return apiResponse.badRequest("Address and chain are required");
    }

    const { data, error } = await client.rpc("link_wallet", {
      p_address: address,
      p_chain: chain,
      p_type: walletType,
      p_label: label,
      p_capabilities: capabilities,
      p_chain_id: chainId,
    });

    if (error) {
      return apiResponse.error("WALLET_LINK_ERROR", error.message || "Failed to link wallet", 502);
    }

    return apiResponse.success({ status: "linked", wallet_id: data ?? null, chain, address });
  } catch (error) {
    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to link wallet");
  }
}
