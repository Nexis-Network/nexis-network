"use client";

import { useEffect, useRef } from "react";
import { ingestSandboxWorkbenchTool } from "@/components/artifacts/sandbox-workbench-ingestion";
import { buildWorkbenchToolFingerprint } from "@/components/artifacts/sandbox-workbench-fingerprint";
import type { SandboxWorkbenchToolBindings } from "@/components/artifacts/sandbox-workbench-ingestion.shared";

type UseSandboxWorkbenchToolIngestionArgs = SandboxWorkbenchToolBindings & {
  activeTool?: UntypedJson | null;
};

export function useSandboxWorkbenchToolIngestion({
  activeTool,
  ...bindings
}: UseSandboxWorkbenchToolIngestionArgs) {
  const lastToolFingerprintRef = useRef("");
  const bindingsRef = useRef(bindings);

  useEffect(() => {
    bindingsRef.current = bindings;
  });

  useEffect(() => {
    if (!activeTool || typeof activeTool !== "object") return;

    const fingerprint = buildWorkbenchToolFingerprint(activeTool);
    if (fingerprint === lastToolFingerprintRef.current) return;
    lastToolFingerprintRef.current = fingerprint;

    ingestSandboxWorkbenchTool({
      activeTool,
      bindings: bindingsRef.current,
    });
  }, [activeTool]);
}
