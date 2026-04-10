import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { getEvmProtocols } from "@/server/actions/wallets-api";


import { logger } from '@/lib/logger';
export async function GET(req: NextRequest) {
    await connection();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const chainId = searchParams.get("chainId") || "1";
    
    if (!address) {
        return apiResponse.badRequest("Missing address");
    }

    const isEvm = address.startsWith("0x");

    if (!isEvm) {
        return apiResponse.badRequest("Not supported for this network");
    }

    try {
        const chainHex = chainId.startsWith("0x") ? chainId : `0x${Number(chainId).toString(16)}`;
        const data = await getEvmProtocols(address, chainHex);
        if (data.error) throw new Error(data.error);

        return apiResponse.success({ 
            protocols: data.protocols,
            totalUsd: data.totalUsd
        });
    } catch (e: UntypedJson) {
        // Safe fallback for extension
        logger.warn("Failed to fetch protocols:", e instanceof Error ? e.message : String(e));
        return apiResponse.success({ 
            protocols: [],
            totalUsd: 0
        });
    }
}

