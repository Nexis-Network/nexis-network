import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { getEvmActivity, getSolanaActivity } from "@/server/actions/wallets-api";

export async function GET(req: NextRequest) {
    await connection();
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const chainId = searchParams.get("chainId") || "1";
    
    if (!address) {
        return apiResponse.badRequest("Missing address");
    }

    const isSolana = address && !address.startsWith("0x");

    try {
        if (isSolana) {
            const data = await getSolanaActivity(address);
            if (data.error) throw new Error(data.error);
            return apiResponse.success({ activity: data.transactions });
        } else {
            const chainHex = chainId.startsWith("0x") ? chainId : `0x${Number(chainId).toString(16)}`;
            const data = await getEvmActivity(address, chainHex);
            if (data.error) throw new Error(data.error);
            return apiResponse.success({ activity: data.transactions });
        }
    } catch (e: UntypedJson) {
        return apiResponse.internalError(e instanceof Error ? e.message : String(e));
    }
}

