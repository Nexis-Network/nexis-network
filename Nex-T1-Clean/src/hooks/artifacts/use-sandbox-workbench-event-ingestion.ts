"use client";

import { useEffect, useRef } from "react";
import type { AIEvent } from "@/lib/schema";
import { buildWorkbenchEventFingerprint } from "@/components/artifacts/sandbox-workbench-fingerprint";
import type { WorkbenchTab } from "@/components/artifacts/sandbox-workbench.types";

type UseSandboxWorkbenchEventIngestionArgs = {
  activeEvent?: AIEvent | null;
  appendSimulatorEntry: (entry: {
    label: string;
    status?: string;
    details?: string;
  }) => void;
  appendTerminal: (value: string) => void;
  hasRichArtifactData: boolean;
  setActiveTab: (value: WorkbenchTab | ((current: WorkbenchTab) => WorkbenchTab)) => void;
  setCode: (value: string) => void;
  setPreviewHtml: (value: string) => void;
  setPreviewUrl: (value: string) => void;
  setSandboxId: (value: string | null) => void;
  setWebHtml: (value: string) => void;
  setWebUrl: (value: string) => void;
};

export function useSandboxWorkbenchEventIngestion({
  activeEvent,
  appendSimulatorEntry,
  appendTerminal,
  hasRichArtifactData,
  setActiveTab,
  setCode,
  setPreviewHtml,
  setPreviewUrl,
  setSandboxId,
  setWebHtml,
  setWebUrl,
}: UseSandboxWorkbenchEventIngestionArgs) {
  const lastEventFingerprintRef = useRef("");
  const bindingsRef = useRef({
    appendSimulatorEntry,
    appendTerminal,
    hasRichArtifactData,
    setActiveTab,
    setCode,
    setPreviewHtml,
    setPreviewUrl,
    setSandboxId,
    setWebHtml,
    setWebUrl,
  });

  useEffect(() => {
    bindingsRef.current = {
      appendSimulatorEntry,
      appendTerminal,
      hasRichArtifactData,
      setActiveTab,
      setCode,
      setPreviewHtml,
      setPreviewUrl,
      setSandboxId,
      setWebHtml,
      setWebUrl,
    };
  });

  useEffect(() => {
    if (!activeEvent) return;

    const fingerprint = buildWorkbenchEventFingerprint(activeEvent);
    if (fingerprint === lastEventFingerprintRef.current) return;
    lastEventFingerprintRef.current = fingerprint;

    const {
      appendSimulatorEntry,
      appendTerminal,
      hasRichArtifactData,
      setActiveTab,
      setCode,
      setPreviewHtml,
      setPreviewUrl,
      setSandboxId,
      setWebHtml,
      setWebUrl,
    } = bindingsRef.current;

    switch (activeEvent.type) {
      case "sandbox_start":
        setSandboxId(activeEvent.sandboxId);
        appendTerminal(
          `Sandbox ${activeEvent.sandboxId} started with template "${activeEvent.template}".`,
        );
        appendSimulatorEntry({
          label: "Sandbox Started",
          status: "running",
          details: activeEvent.template,
        });
        setActiveTab("terminal");
        break;
      case "sandbox_stream":
        setSandboxId(activeEvent.sandboxId);
        appendTerminal(activeEvent.data);
        break;
      case "terminal_stream":
        appendTerminal(activeEvent.output);
        setActiveTab("terminal");
        break;
      case "jsx_output":
        setCode(activeEvent.code);
        setActiveTab("code");
        break;
      case "web_preview_output":
        if (activeEvent.url) {
          setWebUrl(activeEvent.url);
          setPreviewUrl(activeEvent.url);
          setActiveTab("web");
        } else {
          setWebHtml(activeEvent.html);
          setPreviewHtml(activeEvent.html);
          setActiveTab("preview");
        }
        break;
      case "workflow_update":
      case "task_update":
      case "test_result":
      case "confirmation_request":
      case "confirmation_response":
        appendSimulatorEntry({
          label:
            activeEvent.type === "workflow_update"
              ? `Workflow: ${activeEvent.stepName}`
              : activeEvent.type === "task_update"
                ? `Task: ${activeEvent.title}`
                : activeEvent.type === "test_result"
                  ? `Test: ${activeEvent.name}`
                  : activeEvent.type === "confirmation_request"
                    ? "Confirmation Requested"
                    : "Confirmation Response",
          status:
            "status" in activeEvent && typeof activeEvent.status === "string"
              ? activeEvent.status
              : "riskLevel" in activeEvent
                ? activeEvent.riskLevel
                : undefined,
          details:
            activeEvent.type === "workflow_update"
              ? `progress=${activeEvent.progress ?? 0}`
              : activeEvent.type === "task_update"
                ? activeEvent.taskId
                : activeEvent.type === "test_result"
                  ? activeEvent.testId
                  : activeEvent.type === "confirmation_request"
                    ? activeEvent.summary
                    : activeEvent.txHash ??
                      activeEvent.error ??
                      activeEvent.confirmationId,
        });
        if (!hasRichArtifactData) {
          setActiveTab("simulator");
        }
        break;
      default:
        break;
    }
  }, [activeEvent]);
}
