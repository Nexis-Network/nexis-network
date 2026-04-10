"use client";

import type {
  NativeIdeFile,
  NativeIdeSessionData,
} from "@/modules/chat/ui-message-parts";

export type NativeIdeWorkbenchTab =
  | "files"
  | "code"
  | "preview"
  | "terminal"
  | "tests";

export type CompactArtifactViewport = "phone" | "tablet";

function isNativeIdeFilePathValid(path: unknown): path is string {
  return typeof path === "string" && path.trim().length > 0;
}

export function sanitizeNativeIdeSession(
  session: NativeIdeSessionData,
): NativeIdeSessionData {
  const files = session.files.flatMap((file) => {
    if (!isNativeIdeFilePathValid(file?.path)) {
      return [];
    }

    return [{ ...file, path: file.path.trim() } satisfies NativeIdeFile];
  });

  const activePath = files.some((file) => file.path === session.activePath)
    ? session.activePath
    : undefined;
  const entryFile = files.some((file) => file.path === session.entryFile)
    ? session.entryFile
    : undefined;

  return {
    ...session,
    activePath,
    entryFile,
    files,
  };
}

export function resolvePreferredSelectedPath(
  session: NativeIdeSessionData,
): string | null {
  return session.activePath ?? session.entryFile ?? session.files[0]?.path ?? null;
}

export function resolveDefaultWorkbenchTab(
  session: NativeIdeSessionData,
): Exclude<NativeIdeWorkbenchTab, "files"> {
  const preferredMode = session.mode?.trim().toLowerCase();

  if (
    (preferredMode === "tests" || preferredMode === "test") &&
    session.testResults?.items?.length
  ) {
    return "tests";
  }

  if (
    (preferredMode === "terminal" || preferredMode === "console") &&
    session.terminal
  ) {
    return "terminal";
  }

  if (
    ["preview", "web", "html", "jsx"].includes(preferredMode ?? "") &&
    (session.jsxPreview || session.previewUrl || session.previewHtml)
  ) {
    return "preview";
  }

  if (session.previewUrl || session.previewHtml || session.jsxPreview) {
    return "preview";
  }

  if (session.terminal) {
    return "terminal";
  }

  if (session.testResults?.items?.length && session.files.length === 0) {
    return "tests";
  }

  return "code";
}

export function resolveInitialWorkbenchTab(
  session: NativeIdeSessionData,
  viewport: CompactArtifactViewport,
): NativeIdeWorkbenchTab {
  if (viewport === "phone" && session.files.length > 0) {
    return "files";
  }

  return resolveDefaultWorkbenchTab(session);
}

export function isImmersiveWorkbenchTab(
  tab: NativeIdeWorkbenchTab,
): boolean {
  return tab === "code" || tab === "preview" || tab === "terminal";
}

export function isWorkbenchTabAvailable(
  tab: NativeIdeWorkbenchTab,
  session: NativeIdeSessionData,
): boolean {
  switch (tab) {
    case "files":
      return session.files.length > 0;
    case "preview":
      return Boolean(session.jsxPreview || session.previewUrl || session.previewHtml);
    case "terminal":
      return Boolean(session.terminal);
    case "tests":
      return Boolean(session.testResults?.items?.length);
    default:
      return true;
  }
}
