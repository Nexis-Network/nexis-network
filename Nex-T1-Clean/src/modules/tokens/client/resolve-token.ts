"use client";

import { getApiErrorMessage, unwrapApiPayload } from "@/lib/api-platform";
import type { TokenAssetInfo } from "@/modules/tokens/types";

export async function resolveTokenImport(input: {
  address: string;
  chainId: number;
}): Promise<TokenAssetInfo> {
  const params = new URLSearchParams({
    chainId: String(input.chainId),
    address: input.address,
  });
  const response = await fetch(`/api/tokens/resolve?${params.toString()}`, {
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Failed to resolve token"));
  }

  const token = unwrapApiPayload<TokenAssetInfo>(payload);
  if (!token) {
    throw new Error("Resolved token payload was empty");
  }

  return token;
}
