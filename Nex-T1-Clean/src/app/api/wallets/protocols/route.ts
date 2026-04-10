import { connection, NextResponse } from "next/server";
import { getEvmProtocols } from "@/server/actions/wallets-api";
import { withSingleFlight } from "@/server/services/redis/single-flight";

function normalizeEvmChainId(value: string | null): string | null {
    if (!value) return "0x1";

    if (value.startsWith("0x")) {
        const isHex = /^0x[0-9a-fA-F]+$/.test(value);
        return isHex ? value.toLowerCase() : null;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return `0x${parsed.toString(16)}`;
}

export async function GET(request: Request) {
    await connection();
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get("address");
        const chainId = normalizeEvmChainId(searchParams.get("chainId"));

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        if (!address.startsWith("0x")) {
            return NextResponse.json({ error: "Protocols are only supported for EVM addresses" }, { status: 400 });
        }

        if (!chainId) {
            return NextResponse.json({ error: "Invalid chainId" }, { status: 400 });
        }

        const cacheKey = `protocols:evm:${chainId}:${address.toLowerCase()}`;

        const data = await withSingleFlight(
            cacheKey,
            async () => await getEvmProtocols(address, chainId),
            60,
        );

        if (data.error) {
            return NextResponse.json(data, { status: 502 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Protocols API Error:", error);
        return NextResponse.json({ error: "Failed to fetch protocols" }, { status: 500 });
    }
}
