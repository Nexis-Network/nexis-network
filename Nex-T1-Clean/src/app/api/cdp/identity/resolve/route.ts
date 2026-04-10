import "server-only";

import { connection, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveIdentity, resolveAddress } from "@/server/services/cdp/identity";
import { logger } from "@/lib/logger";

/**
 * CDP Identity Resolution API
 *
 * GET /api/cdp/identity/resolve?address=0x...
 * GET /api/cdp/identity/resolve?name=vitalik.eth
 *
 * Resolves an EVM address to a human-readable name (ENS or Basename),
 * or resolves a name back to an address.
 *
 * No auth required (public on-chain data).
 * Results are cached at the service layer (Redis 5min) and via
 * Next.js revalidation (15s stale).
 */

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

const nameSchema = z
  .string()
  .min(3, "Name too short")
  .max(255, "Name too long")
  .regex(/^[a-zA-Z0-9.\-_]+$/, "Invalid name format");

export async function GET(request: NextRequest) {
  await connection();
  const { searchParams } = new URL(request.url);
  const addressParam = searchParams.get("address");
  const nameParam = searchParams.get("name");

  // Must provide exactly one of address or name
  if (!addressParam && !nameParam) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Provide either 'address' or 'name' query parameter" },
      },
      { status: 400 },
    );
  }

  if (addressParam && nameParam) {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Provide only one of 'address' or 'name', not both" },
      },
      { status: 400 },
    );
  }

  try {
    // Forward resolution: address -> name
    if (addressParam) {
      const parsed = addressSchema.safeParse(addressParam);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: { message: parsed.error.issues[0]?.message ?? "Invalid address" },
          },
          { status: 400 },
        );
      }

      const identity = await resolveIdentity(parsed.data);

      return NextResponse.json(
        { success: true, data: identity },
        {
          headers: {
            "Cache-Control": "public, s-maxage=15, stale-while-revalidate=300",
          },
        },
      );
    }

    // Reverse resolution: name -> address
    const parsed = nameSchema.safeParse(nameParam);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { message: parsed.error.issues[0]?.message ?? "Invalid name" },
        },
        { status: 400 },
      );
    }

    const resolvedAddr = await resolveAddress(parsed.data);

    return NextResponse.json(
      {
        success: true,
        data: {
          name: parsed.data,
          address: resolvedAddr,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    logger.error("identity_resolution_api_error", {
      error: err instanceof Error ? err.message : String(err),
      address: addressParam,
      name: nameParam,
    });

    return NextResponse.json(
      {
        success: false,
        error: { message: "Identity resolution failed" },
      },
      { status: 502 },
    );
  }
}
