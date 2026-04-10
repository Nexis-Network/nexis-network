import { createLogger } from "@/server/logging/logging";
import { z } from "zod";

const logger = createLogger("0x-swap");



// Schema for the Quote Request
export const ZeroExQuoteSchema = z.object({
  sellToken: z.string(),
  buyToken: z.string(),
  sellAmount: z.string().optional(),
  buyAmount: z.string().optional(),
  takerAddress: z.string().optional(),
  chainId: z.coerce.number(), // 0x API expects chainId as distinct for some endpoints or headers, but standard Quote params usually imply chain via domain or header. 
  // Actually, 0x API v1 for different chains is usually handled via subdomain (e.g. polygon.api.0x.org) OR standard mainnet with chainId param? 
  // Checking best practices: 0x recommmends https://api.0x.org/ with `0x-chain-id` header? Or different subdomains. 
  // Recent docs suggest `https://api.0x.org/swap/permit2/quote` etc. 
  // Let's stick to the standard `/swap/v1/quote` and use headers or query params based on 0x docs.
  // Standard free tier often uses `https://{chain}.api.0x.org`.
  // However, modern 0x API V2 often aggregates. 
  // Let's assume standard V1 with subdomains or query params. 
  // We will map chainId to domain.
});

export type ZeroExQuoteParams = z.infer<typeof ZeroExQuoteSchema>;

const FEE_RECIPIENT = process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS || "0x0000000000000000000000000000000000000000"; 
const AFFILIATE_FEE = 0.01; // 1%

const BASE_URL = "https://api.0x.org";

// Map Chain ID to 0x API base URL or Prefix
// Modern 0x API uses unified endpoint with chainId param
function getZeroExUrl(endpoint: string): string {
    return `${BASE_URL}${endpoint}`;
}

export async function getZeroExSwapQuote(params: ZeroExQuoteParams) {
    const url = new URL(getZeroExUrl("/swap/allowance-holder/quote"));

    // Required Params
    url.searchParams.append("sellToken", params.sellToken);
    url.searchParams.append("buyToken", params.buyToken);
    url.searchParams.append("chainId", params.chainId.toString()); // Critical for unified endpoint

    if (params.sellAmount) url.searchParams.append("sellAmount", params.sellAmount);
    if (params.buyAmount) url.searchParams.append("buyAmount", params.buyAmount);
    if (params.takerAddress) url.searchParams.append("taker", params.takerAddress); // Note: 0x uses 'taker' not 'takerAddress' in some docs, but stick to schema if verified. Docs say 'taker'.
    
    // Fee Params (Monetization)
    url.searchParams.append("buyTokenPercentageFee", AFFILIATE_FEE.toString());
    url.searchParams.append("feeRecipient", FEE_RECIPIENT);

    const apiKey = process.env.ZERO_EX_API_KEY;

    try {
        const res = await fetch(url.toString(), {
            headers: {
                "0x-api-key": apiKey || "",
                "0x-version": "v2", 
            }
        });

        if (!res.ok) {
            const error = await res.text();
            logger.error(`0x Quote Failed: ${res.status} ${error}`);
            throw new Error(`Swap Quote Failed: ${error}`);
        }

        const data = await res.json();
        return data;

    } catch (error) {
        logger.error("0x API Error", { error });
        throw error;
    }
}

export async function getIndicativePrice(params: ZeroExQuoteParams) {
    const url = new URL(getZeroExUrl("/swap/allowance-holder/price"));

    url.searchParams.append("sellToken", params.sellToken);
    url.searchParams.append("buyToken", params.buyToken);
    url.searchParams.append("chainId", params.chainId.toString());

    if (params.sellAmount) url.searchParams.append("sellAmount", params.sellAmount);
    if (params.buyAmount) url.searchParams.append("buyAmount", params.buyAmount);
    // Taker address usually not needed for indicative price, but good practice if available
    if (params.takerAddress) url.searchParams.append("taker", params.takerAddress);

    url.searchParams.append("buyTokenPercentageFee", AFFILIATE_FEE.toString());
    url.searchParams.append("feeRecipient", FEE_RECIPIENT);

    const apiKey = process.env.ZERO_EX_API_KEY;

    try {
        const res = await fetch(url.toString(), {
            headers: {
                "0x-api-key": apiKey || "",
                "0x-version": "v2",
            }
        });

        if (!res.ok) {
            const error = await res.text();
            logger.error(`0x Price Failed: ${res.status} ${error}`);
            throw new Error(`Swap Price Failed: ${error}`);
        }

        const data = await res.json();
        return data;

    } catch (error) {
        logger.error("0x API Price Error", { error });
        throw error;
    }
}
