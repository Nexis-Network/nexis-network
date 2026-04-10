"use client";

import type { ToolUIPart } from "ai";
import type { AIEvent } from "@/lib/schema";
import { Confirmation } from "@/components/ai-elements/confirmation";
import { InlineCitation, InlineCitationSource } from "@/components/ai-elements/inline-citation";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { WebPreview, WebPreviewBody } from "@/components/ai-elements/web-preview";
import { CodeSandbox } from "@/components/ai-elements/code-sandbox";
import { TerminalElement } from "@/components/ai-elements/terminal-element";

export function renderActiveEventContent(activeEvent?: AIEvent | null) {
  if (!activeEvent) return null;

  switch (activeEvent.type) {
    case "reasoning_update":
      return (
        <div className="w-full p-4">
          <Reasoning isStreaming={!activeEvent.isComplete} open={true}>
            {activeEvent.isComplete
              ? "Internal reasoning complete."
              : "Internal reasoning in progress."}
          </Reasoning>
        </div>
      );
    case "sandbox_start":
    case "sandbox_stream":
      return (
        <div className="w-full">
          <CodeSandbox
            toolPart={{
              toolCallId: `sandbox-${activeEvent.sandboxId}`,
              toolName: "sandbox",
              args: {
                code:
                  activeEvent.type === "sandbox_start"
                    ? activeEvent.template
                    : activeEvent.data,
              },
              result: undefined,
              state: "input-streaming",
            } as unknown as ToolUIPart}
          />
        </div>
      );
    case "terminal_stream":
      return (
        <div className="w-full">
          <TerminalElement
            toolPart={{
              toolCallId: `terminal-${activeEvent.command}`,
              toolName: "terminal",
              args: { command: activeEvent.command },
              result: { logs: activeEvent.output },
              state: activeEvent.isComplete
                ? "output-available"
                : "input-streaming",
            } as unknown as ToolUIPart}
          />
        </div>
      );
    case "citation":
      return (
        <div className="w-full p-4">
          <InlineCitation>
            <InlineCitationSource
              url={activeEvent.url}
              title={activeEvent.title || "Citation"}
            />
          </InlineCitation>
        </div>
      );
    case "sources":
      return (
        <div className="w-full p-4 block">
          <Sources>
            <SourcesTrigger
              count={activeEvent.sources.length}
              sources={activeEvent.sources}
            />
            <SourcesContent>
              {activeEvent.sources.map((source, index) => (
                <Source
                  key={source.id || index}
                  href={source.url}
                  title={source.title || "Source"}
                />
              ))}
            </SourcesContent>
          </Sources>
        </div>
      );
    case "confirmation_request":
      return (
        <div className="w-full p-4">
          <Confirmation
            title="Action Required"
            description={activeEvent.summary}
            isPending={true}
          />
        </div>
      );
    case "confirmation_response":
      return (
        <div className="w-full p-4">
          <Confirmation
            title="Action Status"
            description={`Transaction ${activeEvent.status}`}
            isPending={false}
          />
        </div>
      );
    case "approval_required": {
      const preview =
        activeEvent.preview && typeof activeEvent.preview === "object"
          ? (activeEvent.preview as {
              title?: string;
              description?: string;
            })
          : null;
      const summary = [
        preview?.title ?? "Tool execution requires approval.",
        preview?.description,
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <div className="w-full p-4">
          <Confirmation
            title="Approval Required"
            description={summary || "Review and approve this operation to continue."}
            isPending={true}
          />
        </div>
      );
    }
    case "approval_update": {
      const state =
        typeof activeEvent.state === "string" && activeEvent.state.length > 0
          ? activeEvent.state
          : "updated";
      const terminalStates = new Set([
        "ready",
        "approved",
        "auto_approved",
        "rejected",
        "expired",
        "cancelled",
        "denied",
        "failed",
        "error",
        "completed",
      ]);

      return (
        <div className="w-full p-4">
          <Confirmation
            title="Approval Update"
            description={`Request ${state.replace(/_/g, " ")}`}
            isPending={!terminalStates.has(state.toLowerCase())}
          />
        </div>
      );
    }
    case "jsx_output":
    case "web_preview_output":
      return (
        <div className="w-full max-h-[600px] overflow-auto p-4">
          <WebPreview className="h-full min-h-[400px] w-full rounded-md border border-border">
            <WebPreviewBody
              srcDoc={
                activeEvent.type === "web_preview_output"
                  ? activeEvent.html
                  : activeEvent.code
              }
            />
          </WebPreview>
        </div>
      );
    default:
      return null;
  }
}
