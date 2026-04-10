"use client";

import type { ReactElement, ReactNode } from "react";

import { ChunkReloadListener } from "@/components/providers/chunk-reload-listener";
import { Toaster } from "@/components/ui/sonner";

type MarketingRouteProvidersProps = {
  children: ReactNode;
};

export function MarketingRouteProviders({
  children,
}: MarketingRouteProvidersProps): ReactElement {
  return (
    <>
      <ChunkReloadListener />
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}
