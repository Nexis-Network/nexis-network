"use client";

import { useEffect, useMemo, useState } from "react";
import type { NativeIdeSessionData } from "@/modules/chat/ui-message-parts";
import {
  isWorkbenchTabAvailable,
  resolveDefaultWorkbenchTab,
  resolveInitialWorkbenchTab,
  resolvePreferredSelectedPath,
  type CompactArtifactViewport,
} from "@/components/artifacts/native-ide-workbench.utils";

type NativeIdeDockTab = "logs" | "terminal";
type NativeIdeMainView = "files" | "code" | "preview" | "tests";
type NativeIdeCompactView =
  | NativeIdeMainView
  | NativeIdeDockTab;

export function useNativeIdeWorkbenchState(args: {
  session: NativeIdeSessionData;
  viewport: "desktop" | CompactArtifactViewport;
}) {
  const { session, viewport } = args;
  const preferredSelectedPath = useMemo(
    () => resolvePreferredSelectedPath(session),
    [session],
  );
  const defaultMainView = useMemo<NativeIdeMainView>(() => {
    const resolved = resolveDefaultWorkbenchTab(session);
    if (resolved === "terminal") return "code";
    return resolved;
  }, [session]);
  const initialCompactView = useMemo<NativeIdeCompactView>(() => {
    const resolved = resolveInitialWorkbenchTab(
      session,
      viewport === "desktop" ? "tablet" : viewport,
    );
    return resolved === "terminal" ? "terminal" : resolved;
  }, [session, viewport]);
  const [selectedPath, setSelectedPath] = useState<string | null>(
    preferredSelectedPath,
  );
  const [activeMainView, setActiveMainView] =
    useState<NativeIdeMainView>(defaultMainView);
  const [activeDockTab, setActiveDockTab] = useState<NativeIdeDockTab>(
    session.terminal ? "terminal" : "logs",
  );
  const [activeCompactView, setActiveCompactView] =
    useState<NativeIdeCompactView>(initialCompactView);

  useEffect(() => {
    setSelectedPath(preferredSelectedPath);
    setActiveMainView(defaultMainView);
    setActiveDockTab(session.terminal ? "terminal" : "logs");
    setActiveCompactView(initialCompactView);
  }, [defaultMainView, initialCompactView, preferredSelectedPath, session.terminal]);

  useEffect(() => {
    setSelectedPath((current) => {
      if (current && session.files.some((file) => file.path === current)) {
        return current;
      }
      return preferredSelectedPath;
    });
  }, [preferredSelectedPath, session.files]);

  useEffect(() => {
    if (activeMainView === "preview" && !isWorkbenchTabAvailable("preview", session)) {
      setActiveMainView(defaultMainView);
    }
    if (activeMainView === "tests" && !isWorkbenchTabAvailable("tests", session)) {
      setActiveMainView(defaultMainView);
    }
  }, [activeMainView, defaultMainView, session]);

  useEffect(() => {
    if (activeCompactView === "preview" && !isWorkbenchTabAvailable("preview", session)) {
      setActiveCompactView(initialCompactView);
    }
    if (activeCompactView === "terminal" && !isWorkbenchTabAvailable("terminal", session)) {
      setActiveCompactView(initialCompactView);
    }
    if (activeCompactView === "tests" && !isWorkbenchTabAvailable("tests", session)) {
      setActiveCompactView(initialCompactView);
    }
  }, [activeCompactView, initialCompactView, session]);

  return {
    activeCompactView,
    activeDockTab,
    activeMainView,
    selectedPath,
    setActiveCompactView,
    setActiveDockTab,
    setActiveMainView,
    setSelectedPath,
  };
}
