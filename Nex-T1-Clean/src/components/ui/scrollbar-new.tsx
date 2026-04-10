"use client";

import dynamic from "next/dynamic";
import React, { ReactNode, useEffect, useState } from "react";

const IDLE_INIT_TIMEOUT_MS = 1200;

type IdleHandle = number | null;

const requestIdle = (callback: () => void): IdleHandle => {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout: IDLE_INIT_TIMEOUT_MS });
  }

  return window.setTimeout(callback, IDLE_INIT_TIMEOUT_MS);
};

const cancelIdle = (handle: IdleHandle) => {
  if (handle == null || typeof window === "undefined") {
    return;
  }

  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};

const ScrollIndicator = dynamic(() => import("@/components/ui/scroll-indicator").then((mod) => mod.ScrollIndicator), {
  ssr: false,
});

const Skiper95 = ({ children }: { children: ReactNode }) => {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handle = requestIdle(() => setShowIndicator(true));
    return () => cancelIdle(handle);
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col">
      {showIndicator ? <ScrollIndicator /> : null}
      {children}
    </div>
  );
};

export { Skiper95 };
