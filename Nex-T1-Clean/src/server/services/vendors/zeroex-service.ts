import { stringify } from "qs";
import { kvCache } from "@/server/services/cache";

const ZERO_EX_BASE_URL = "https://api.0x.org";

export type ZeroExSwapSide = "sell" | "buy";

export class ZeroExApiError extends Error {
  readonly status: number;
  readonly body?: string;

  constructor(status: number, message: string, body?: string) {
    super(message);
    this.name = "ZeroExApiError";
    this.status = status;
    this.body = body;
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

export type ZeroExSwapPriceParams = {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  taker?: string;
  intentOnFilling?: boolean;
  slippageBps?: number;
};

export type ZeroExSwapQuoteParams = ZeroExSwapPriceParams & {
  takerAddress?: string;
};

export type ZeroExSwapPriceResponse = {
  chainId: number;
  price: string;
  guaranteedPrice: string;
  value: string;
  estimate: {
    buyAmount: string;
    sellAmount: string;
    gas: string;
  };
};

export type ZeroExSwapQuoteResponse = {
  chainId: number;
  price: string;
  guaranteedPrice: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
  buyAmount: string;
  sellAmount: string;
};

function buildHeaders() {
  const apiKey =
    process.env.ZERO_EX_API_KEY ??
    process.env.ZEROEX_API_KEY ??
    process.env.NEX_T1_0X_API_KEY ??
    process.env.NEXT_PUBLIC_NEX_T1_0X_API_KEY;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "0x-version": "v2",
  };
  if (apiKey) {
    headers["0x-api-key"] = apiKey;
  }
  return headers;
}

function buildUrl(path: string, params?: Record<string, UntypedJson>) {
  const query = params ? stringify(params, { arrayFormat: "brackets", skipNulls: true }) : "";
  return `${ZERO_EX_BASE_URL}${path}${query ? `?${query}` : ""}`;
}

export async function fetchZeroExPrice(params: ZeroExSwapPriceParams): Promise<ZeroExSwapPriceResponse> {
  if (!params.sellAmount && !params.buyAmount) {
    throw new Error("Either sellAmount or buyAmount must be provided");
  }

  // Generate a stable cache key based on params
  const cacheKey = `zeroex:price:${params.chainId}:${params.sellToken}:${params.buyToken}:${params.sellAmount || params.buyAmount}`;

  // Try cache first
  const cached = await kvCache.get<ZeroExSwapPriceResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(buildUrl("/swap/allowance-holder/price", params), {
    method: "GET",
    headers: buildHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ZeroExApiError(response.status, text || "Failed to fetch 0x price", text);
  }
  
  const data = await response.json();
  
  // Cache for 15 seconds
  await kvCache.put(cacheKey, data, 15);
  
  return data;
}

export async function fetchZeroExQuote(params: ZeroExSwapQuoteParams): Promise<ZeroExSwapQuoteResponse> {
  if (!params.sellAmount && !params.buyAmount) {
    throw new Error("Either sellAmount or buyAmount must be provided");
  }

  // Quote params are more specific (include takerAddress), so cache key must include it
  const cacheKey = `zeroex:quote:${params.chainId}:${params.sellToken}:${params.buyToken}:${params.sellAmount || params.buyAmount}:${params.takerAddress || 'no-taker'}`;

  // Try cache first
  const cached = await kvCache.get<ZeroExSwapQuoteResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(buildUrl("/swap/allowance-holder/quote", params), {
    method: "GET",
    headers: buildHeaders(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ZeroExApiError(response.status, text || "Failed to fetch 0x quote", text);
  }
  
  const data = await response.json();
  
  // Cache for 10 seconds (quotes expire quickly)
  await kvCache.put(cacheKey, data, 10);
  
  return data;
}
