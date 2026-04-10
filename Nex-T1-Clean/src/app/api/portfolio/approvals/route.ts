import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { moralisRequest, MoralisError } from "@/server/moralis/client";
import { withAuth } from "@/server/security/with-auth";


import { logger } from '@/lib/logger';
interface TokenApproval {
  token_address: string;
  token_symbol: string;
  token_name: string;
  token_logo?: string;
  token_decimals: string;
  spender_address: string;
  spender_label?: string; // Enhanced with known spender labels if possible
  value: string; // Approved amount
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
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

  if (!address) {
    return apiResponse.badRequest("Address is required");
  }

  try {
     // Path: /wallets/{address}/approvals
     // Using Moralis endpoint: getWalletTokenApprovals
     // https://docs.moralis.com/web3-data-api/evm/reference/get-wallet-token-approvals
     
     const response = await moralisRequest<{ result: TokenApproval[] }>({
        api: "evm",
        // Docs say: /avalanche/wallets/{address}/approvals ? No.
        // It's usually `/{address}/approvals` or `GET /approvals/{address}` is unlikely.
        // Correct path for standard EVM API is `/{address}/erc20/approvals`.
        path: `/${address}/erc20/approvals`, 
        query: { chain },
        cache: { ttlSeconds: 120, key: `approvals:${address}:${chain}` }
     });

     return apiResponse.success({
         result: response.result || []
     });
     
  } catch (error: UntypedJson) {
    // Moralis 404 means no data found for this address (valid address, just no history/approvals)
    if (error instanceof MoralisError && (error.errorType === 'not_found' || error.meta?.status === 404)) {
      return apiResponse.success({ result: [] });
    }

    logger.error("Wallet Approvals API Error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError("Failed to fetch approvals");
  }
}

