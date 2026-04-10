import { headers } from "next/headers";
import { connection } from "next/server";

/**
 * Retrieve the per-request CSP nonce emitted by middleware.
 * Use this when rendering inline scripts/styles that must be whitelisted.
 */
export const getCspNonce = async (): Promise<string | null> => {
  await connection();
  const hdrs = await headers();
  return hdrs.get("x-nonce");
};
