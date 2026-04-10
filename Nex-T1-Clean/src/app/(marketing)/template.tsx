"use client";

import { ReactNode } from "react";

import { Preloader } from "@/components/visuals/effects/preloader";

export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <Preloader showOncePerSession autoDismissMs={3000} />
      {children}
    </>
  );
}
