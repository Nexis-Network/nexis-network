"use client";

import { useCallback } from "react";

import { useRouter } from "next/navigation";

type NavigateOptions = {
  type: "token" | "nft";
  slug: string;
};

export function useAssetNavigator() {
  const router = useRouter();

  return useCallback(
    ({ type, slug }: NavigateOptions) => {
      if (!slug) return;
      const targetType = type === "nft" ? "nft" : "token";
      router.push(`/analytics/assets/${targetType}/${encodeURIComponent(slug)}`);
    },
    [router],
  );
}
