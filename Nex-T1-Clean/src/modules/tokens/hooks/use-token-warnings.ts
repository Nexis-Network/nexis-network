"use client";

import { resolveTokenWarnings } from "@/modules/tokens/utils/warnings";
import type { TokenAssetInfo } from "@/modules/tokens/types";

export function useTokenWarnings(token: TokenAssetInfo | null) {
  return resolveTokenWarnings(token);
}
