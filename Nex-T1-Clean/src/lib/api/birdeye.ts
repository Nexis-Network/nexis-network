import { cachedFetch } from "./fetch-wrapper";
import type { 
    TokenListResponse, 
    TransactionListResponse 
} from "@/types/birdeye";

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || ""; // Should be in env
const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

const headers = {
  "X-API-KEY": BIRDEYE_API_KEY,
  "x-chain": "solana",
  "Accept": "application/json",
};

// V1 Endpoint: /v1/wallet/token_list
export async function fetchSolanaWalletTokenList(address: string) {
  // Using public-api.birdeye.so/v1/wallet/token_list?wallet=...
  const url = `${BIRDEYE_BASE_URL}/v1/wallet/token_list?wallet=${address}`;
  return cachedFetch<TokenListResponse>(url, { headers, ttl: 60 });
}

// V1 Endpoint: /v1/wallet/tx_list
export async function fetchSolanaWalletTransactionHistory(address: string, limit = 25) {
  const url = `${BIRDEYE_BASE_URL}/v1/wallet/tx_list?wallet=${address}&limit=${limit}`;
  // Birdeye API standard response wrapper { success: boolean, data: ... }
  // We need to handle that wrapper.
  // Wait, cachedFetch returns the JSON. We need to define types properly or unwrap it here.
  // Let's modify valid fetch wrapper or return raw and unwrap in hook.
  // Recommendation: Unwrap data here for cleaner API similar to Moralis client.
  
  // Re-implementing specific fetch for Birdeye to unwrap 'data'
  const response = await cachedFetch<{ success: boolean; data: TransactionListResponse }>(url, { headers, ttl: 30 });
  if (response.success) {
      return response.data;
  }
  return { items: [], hasNext: false, offset: 0, limit } as TransactionListResponse;
}
