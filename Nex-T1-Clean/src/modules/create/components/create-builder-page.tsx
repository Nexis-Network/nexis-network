"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { fetchCreateMessages, fetchCreateWorkspace } from "@/modules/create/api";
import {
  claimCreateProjectWithRefresh,
  isUuid,
  submitCreatePrompt,
} from "@/modules/create/create-builder-actions";
import type {
  CreateCapability,
  CreateNormalizedMessage,
  CreateTemplate,
  CreateTemplateId,
  CreateWorkspace,
} from "@/modules/create/types";

import { CreateBuilderDesktop } from "./create-builder-desktop";
import { CreateBuilderMobile } from "./create-builder-mobile";
import { CreateBuilderShell } from "./create-builder-shell";

type CreateBuilderPageProps = {
  capabilities: readonly CreateCapability[];
  templates: readonly CreateTemplate[];
};

export function CreateBuilderPage({
  capabilities,
  templates,
}: CreateBuilderPageProps) {
  const [workspace, setWorkspace] = useState<CreateWorkspace>({
    claimableProjects: [],
    projects: [],
    viewer: { kind: "anonymous" },
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CreateNormalizedMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<CreateTemplateId>(templates[0]?.id ?? "wagmi-evm");
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [streamingText, setStreamingText] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState("build");

  const activeProject = useMemo(
    () => workspace.projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, workspace.projects],
  );

  const applyWorkspace = useCallback((nextWorkspace: CreateWorkspace, preferredProjectId?: string | null) => {
    setWorkspace(nextWorkspace);
    setActiveProjectId((current) => {
      const candidate = preferredProjectId ?? current;
      if (candidate && nextWorkspace.projects.some((project) => project.id === candidate)) {
        return candidate;
      }
      return nextWorkspace.projects[0]?.id ?? null;
    });
  }, []);

  const loadWorkspace = useCallback(async (preferredProjectId?: string | null) => {
    setWorkspaceLoading(true);
    try {
      applyWorkspace(await fetchCreateWorkspace(), preferredProjectId);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load create workspace.";
      setError(message);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [applyWorkspace]);

  const loadMessages = useCallback(async (projectId: string) => {
    try {
      setMessages(await fetchCreateMessages(projectId));
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load project messages.";
      setError(message);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!isUuid(activeProjectId)) {
      setMessages([]);
      return;
    }
    void loadMessages(activeProjectId);
  }, [activeProjectId, loadMessages]);

  useEffect(() => {
    if (activeProject) {
      setSelectedTemplateId(activeProject.templateId);
    }
  }, [activeProject]);

  const handleSubmit = async (prompt: string) => {
    if (submitting) {
      return;
    }
    await submitCreatePrompt({
      activeProjectId,
      loadWorkspace,
      messages,
      prompt,
      selectedTemplateId,
      setActiveProjectId,
      setError,
      setInput,
      setMessages,
      setMobileTab,
      setSubmitting,
      setStreamingText,
      streamEnabled,
    });
  };

  const handleClaim = async (projectId: string) => {
    await claimCreateProjectWithRefresh({
      loadWorkspace,
      projectId,
      setError,
    });
  };

  const historyProps = {
    activeProjectId,
    claimableProjects: workspace.claimableProjects,
    loading: workspaceLoading,
    onClaim: handleClaim,
    onNewProject: () => {
      setActiveProjectId(null);
      setMessages([]);
      setStreamingText("");
      setError(null);
      startTransition(() => setMobileTab("build"));
    },
    onSelect: (projectId: string) => {
      setActiveProjectId(projectId);
      startTransition(() => setMobileTab("build"));
    },
    projects: workspace.projects,
    templates,
    viewer: workspace.viewer,
  };

  const conversationProps = {
    activeProject,
    capabilities,
    error,
    input,
    messages,
    onInputChange: setInput,
    onStreamEnabledChange: setStreamEnabled,
    onSubmit: (prompt: string) => {
      void handleSubmit(prompt);
    },
    onTemplateChange: setSelectedTemplateId,
    selectedTemplateId,
    streamEnabled,
    streamingText,
    submitting,
    templates,
  };

  const previewProps = {
    capabilities,
    project: activeProject,
    streaming: submitting,
    templates,
  };

  return (
    <CreateBuilderShell>
      <CreateBuilderDesktop
        className="h-full"
        conversationProps={conversationProps}
        historyProps={historyProps}
        previewProps={previewProps}
      />

      <CreateBuilderMobile
        conversationProps={conversationProps}
        historyProps={historyProps}
        mobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
        previewProps={previewProps}
      />
    </CreateBuilderShell>
  );
}
