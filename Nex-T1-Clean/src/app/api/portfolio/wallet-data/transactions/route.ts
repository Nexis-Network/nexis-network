import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { moralisRequest, MoralisError } from "@/server/moralis/client";
import { withAuth } from "@/server/security/with-auth";


import { logger } from '@/lib/logger';
interface Transaction {
  hash: string;
  nonce: string;
  transaction_index: string;
  from_address: string;
  to_address: string;
  value: string;
  gas: string;
  gas_price: string;
  input: string;
  block_timestamp: string;
  block_number: string;
  block_hash: string;
  receipt_status: string;
}

export async function GET(req: NextRequest) {
  await connection();
  const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
  if (!auth.ok) {
    return apiResponse.unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chain = searchParams.get("chainId") || "0x1";
  const limit = searchParams.get("limit") || "20";

  if (!address) {
    return apiResponse.badRequest("Address is required");
  }

  try {
     // Path: /wallets/{address}/history
     // Or standard: /{address} for transactions
     // Using: /wallets/{address}/history (Wallet API) -> /wallets/{address}/history
     const response = await moralisRequest<{ result: Transaction[] }>({
        api: "evm",
        path: `/wallets/${address}/history`,
        query: { chain, limit, order: "DESC" },
        cache: { ttlSeconds: 60, key: `txs:${address}:${chain}:${limit}` }
     });

     return apiResponse.success({
         result: response.result || []
     });
     
  } catch (error: UntypedJson) {
    // Moralis 404 means no data found for this address (valid address, just no history/approvals)
    if (error instanceof MoralisError && (error.errorType === 'not_found' || error.meta?.status === 404)) {
      return apiResponse.success({ result: [] });
    }

    logger.error("Wallet History API Error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError("Failed to fetch history");
  }
}

