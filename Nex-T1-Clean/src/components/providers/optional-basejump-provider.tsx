"use client";

import { type ReactNode, useEffect, useState } from "react";

type ProviderProps = { children: ReactNode };

export function OptionalBasejumpProvider({ children }: ProviderProps) {
  const enabled = (process.env.NEXT_PUBLIC_ENABLE_BASEJUMP ?? "false").toLowerCase() === "true";
  const [runtime, setRuntime] = useState<null | {
    Provider: (props: { children?: ReactNode }) => ReactNode;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    (async () => {
      try {
        // Attempt dynamic import without triggering TS module resolution
        const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<UntypedJson>;
        const mod = await dynamicImport("usebasejump/react").catch(() => null);
        if (!mod || cancelled) return;
        const moduleRecord = mod as Record<string, UntypedJson>;
        const Provider =
          moduleRecord.BasejumpProvider ?? moduleRecord.Provider ?? null;
        if (!Provider) return;
        setRuntime({ Provider: Provider as (props: { children?: ReactNode }) => ReactNode });
      } catch {
        // ignore – optional provider
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !runtime?.Provider) {
    return <>{children}</>;
  }
  const Provider = runtime.Provider;
  return <Provider>{children}</Provider>;
}
