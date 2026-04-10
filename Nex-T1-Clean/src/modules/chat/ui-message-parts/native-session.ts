import type { AIEvent } from "@/lib/schema";

import { parseInlineArtifactFiles } from "./artifacts";
import type {
  NativeArtifactCardData,
  NativeIdeSessionData,
  NativeQueueData,
  NativeTestResultsData,
} from "./types";
import {
  appendTerminalOutput,
  asRecord,
  coerceString,
  createDefaultIdeSession,
  hasRenderableIdeSessionSurface,
  upsertIdeFile,
} from "./utils";
import { shouldIncludeWorkflowEventInIdePlan } from "./workflow";

export function normalizeNativeIdeSession(
  data: NativeIdeSessionData,
): NativeIdeSessionData {
  return {
    ...createDefaultIdeSession(),
    ...data,
    files: Array.isArray(data.files) ? data.files : [],
    plan: Array.isArray(data.plan) ? data.plan : [],
    checkpoints: Array.isArray(data.checkpoints) ? data.checkpoints : [],
  };
}

export function cloneIdeSession(
  session: NativeIdeSessionData | null | undefined,
): NativeIdeSessionData {
  return session ? normalizeNativeIdeSession(session) : createDefaultIdeSession();
}

export function resolveRenderableIdeSession(
  session: NativeIdeSessionData,
  explicitSession: NativeIdeSessionData | null,
): NativeIdeSessionData | null {
  if (hasRenderableIdeSessionSurface(session)) {
    return session;
  }

  return hasRenderableIdeSessionSurface(explicitSession) ? explicitSession : null;
}

export function applyIdeArtifactsToSession(
  session: NativeIdeSessionData,
  ideArtifacts: NativeArtifactCardData[],
): void {
  for (const artifactCard of ideArtifacts) {
    session.artifactId = artifactCard.artifactId;
    session.title = session.title ?? artifactCard.title ?? "Artifact Workbench";
    session.updatedAt = artifactCard.updatedAt ?? session.updatedAt;
    session.mode = artifactCard.artifactType;

    if (shouldHydrateArtifactFiles(artifactCard.artifactType)) {
      const files = parseInlineArtifactFiles(artifactCard.artifactType, artifactCard.data);
      for (const file of files) {
        session.files = upsertIdeFile(session.files, file);
      }
      if (!session.activePath && files[0]) {
        session.activePath = files[0].path;
        session.entryFile = files[0].path;
      }
    }

    if (artifactCard.artifactType === "preview" || artifactCard.artifactType === "web") {
      applyPreviewArtifact(session, artifactCard.data);
    }

    if (artifactCard.artifactType === "pdf-viewer") {
      const previewRecord = asRecord(artifactCard.data);
      session.previewUrl = coerceString(previewRecord.url) ?? session.previewUrl;
    }
  }
}

export function applyEventsToSession(
  session: NativeIdeSessionData,
  events: AIEvent[],
): void {
  for (const event of events) {
    switch (event.type) {
      case "sandbox_start":
        session.sandboxId = event.sandboxId;
        session.status = "running";
        session.mode = session.mode ?? "terminal";
        session.title = session.title ?? "Terminal Canvas";
        break;
      case "sandbox_stream":
        applySandboxStream(session, event.sandboxId, event.data);
        break;
      case "terminal_stream":
        session.mode = session.mode ?? "terminal";
        session.title = session.title ?? "Terminal Canvas";
        session.terminal = {
          command: event.command,
          isComplete: event.isComplete,
          output: appendTerminalOutput(session.terminal?.output ?? "", event.output),
        };
        break;
      case "jsx_output":
        session.jsxPreview = {
          code: event.code,
          language: "tsx",
        };
        break;
      case "web_preview_output":
        session.previewUrl = event.url ?? session.previewUrl;
        session.previewHtml = event.html;
        break;
      case "workflow_update":
        applyWorkflowPlanEvent(session, event);
        break;
      default:
        break;
    }
  }
}

export function attachDerivedSessionData(
  session: NativeIdeSessionData,
  queue: NativeQueueData | null,
  testResults: NativeTestResultsData | null,
  checkpoints: NativeIdeSessionData["checkpoints"],
): void {
  if (queue) {
    session.queue = queue;
  }
  if (testResults) {
    session.testResults = testResults;
  }
  if ((checkpoints?.length ?? 0) > 0) {
    session.checkpoints = checkpoints;
  }
}

function shouldHydrateArtifactFiles(artifactType: string): boolean {
  return (
    artifactType === "code" ||
    artifactType === "html" ||
    artifactType === "canvas" ||
    artifactType === "smart-contract-viewer"
  );
}

function applyPreviewArtifact(
  session: NativeIdeSessionData,
  data: unknown,
): void {
  const previewRecord = asRecord(data);
  session.previewUrl =
    coerceString(previewRecord.url) ??
    coerceString(previewRecord.previewUrl) ??
    session.previewUrl;
  session.previewHtml =
    coerceString(previewRecord.html) ??
    coerceString(previewRecord.srcDoc) ??
    session.previewHtml;
}

function applySandboxStream(
  session: NativeIdeSessionData,
  sandboxId: string,
  data: string,
): void {
  session.sandboxId = sandboxId;
  session.mode = session.mode ?? "terminal";
  session.title = session.title ?? "Terminal Canvas";
  session.terminal = {
    command: session.terminal?.command,
    isComplete: false,
    output: appendTerminalOutput(session.terminal?.output ?? "", data),
  };
}

function applyWorkflowPlanEvent(
  session: NativeIdeSessionData,
  event: Extract<AIEvent, { type: "workflow_update" }>,
): void {
  if (!shouldIncludeWorkflowEventInIdePlan(event)) {
    return;
  }

  session.plan = [
    ...(session.plan ?? []),
    {
      id: `${event.workflowId}:${event.stepName}`,
      title: event.stepName,
      status:
        event.status === "running"
          ? "in_progress"
          : event.status === "completed"
            ? "completed"
            : event.status === "failed"
              ? "error"
              : "pending",
      description:
        typeof event.progress === "number"
          ? `${event.progress}% complete`
          : undefined,
    },
  ];
}
