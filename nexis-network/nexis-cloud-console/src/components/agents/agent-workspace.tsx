"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CvmStateIndicator } from "@/components/instances/cvm-state-indicator";
import { getCsrfToken } from "@/lib/csrf";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

export type AgentConfigView = {
  appId: string;
  name: string;
  description: string | null;
  endpointUrl: string | null;
  model: string | null;
  requestFormat: "generic" | "openai";
  prompt: string | null;
  envKeys: string[];
  headerKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeFile = {
  name: string;
  size: number;
  updatedAt: string;
};

type AgentWorkspaceProps = {
  appId: string;
  cvmName: string;
  status: string;
  publicLogs: boolean;
  publicSysinfo: boolean;
  initialConfig: AgentConfigView | null;
  initialKnowledge: KnowledgeFile[];
  secretsEnabled: boolean;
  loadError?: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
};

const CvmLogs = dynamic(
  () => import("@/components/instances/cvm-logs").then((mod) => mod.CvmLogs),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Debug logs</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-secondary">Loading logs…</CardContent>
      </Card>
    ),
  },
);

const tabs = [
  { id: "config", label: "Configuration" },
  { id: "knowledge", label: "Knowledge Base" },
  { id: "chat", label: "Test Chat" },
  { id: "debug", label: "Debug" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function createMessageId() {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AgentWorkspace({
  appId,
  cvmName,
  status,
  publicLogs,
  publicSysinfo,
  initialConfig,
  initialKnowledge,
  secretsEnabled,
  loadError,
}: AgentWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("config");
  const [config, setConfig] = useState<AgentConfigView | null>(initialConfig);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>(initialKnowledge);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [applyEnv, setApplyEnv] = useState(false);
  const [applyHeaders, setApplyHeaders] = useState(false);
  const [envText, setEnvText] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const fallbackConfig = useMemo<AgentConfigView>(() => {
    const now = new Date().toISOString();
    return {
      appId,
      name: cvmName,
      description: null,
      endpointUrl: null,
      model: null,
      requestFormat: "generic",
      prompt: null,
      envKeys: [],
      headerKeys: [],
      createdAt: now,
      updatedAt: now,
    };
  }, [appId, cvmName]);

  const displayConfig = config ?? fallbackConfig;

  const handleSaveConfig = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    setSaveStatus(null);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/agents/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({
          appId,
          name: displayConfig.name,
          description: displayConfig.description,
          endpointUrl: displayConfig.endpointUrl,
          model: displayConfig.model,
          requestFormat: displayConfig.requestFormat,
          prompt: displayConfig.prompt,
          envText: applyEnv ? envText : undefined,
          headerText: applyHeaders ? headerText : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = payload?.invalid?.length ? ` (${payload.invalid.join(", ")})` : "";
        throw new Error(`${payload?.error || "Unable to update configuration."}${details}`);
      }
      setConfig(payload.config ?? displayConfig);
      setApplyEnv(false);
      setApplyHeaders(false);
      setEnvText("");
      setHeaderText("");
      setSaveStatus("Configuration updated.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update configuration.");
    } finally {
      setSaving(false);
    }
  }, [appId, displayConfig, envText, headerText, applyEnv, applyHeaders]);

  const handleUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const csrf = await getCsrfToken();
      const form = new FormData();
      form.append("appId", appId);
      Array.from(files).forEach((file) => form.append("files", file));
      const response = await fetch("/api/agents/knowledge", {
        method: "POST",
        headers: {
          "X-CSRF-Token": csrf,
        },
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to upload files.");
      }
      setKnowledgeFiles(payload.files ?? []);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to upload files.");
    } finally {
      setUploading(false);
    }
  }, [appId]);

  const handleDeleteFile = useCallback(async (filename: string) => {
    setUploading(true);
    setUploadError(null);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/agents/knowledge", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ appId, filename }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to delete file.");
      }
      setKnowledgeFiles((prev) => prev.filter((file) => file.name !== filename));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unable to delete file.");
    } finally {
      setUploading(false);
    }
  }, [appId]);

  const handleSendChat = useCallback(async () => {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    setChatError(null);
    setRawResponse(null);
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: chatMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatLog((prev) => [...prev, userMessage]);
    setChatMessage("");

    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ appId, message: userMessage.content }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Agent request failed.");
      }
      const replyText = payload?.reply || "(no reply)";
      const agentMessage: ChatMessage = {
        id: createMessageId(),
        role: "agent",
        content: replyText,
        timestamp: new Date().toISOString(),
      };
      setChatLog((prev) => [...prev, agentMessage]);
      if (payload?.raw) {
        setRawResponse(JSON.stringify(payload.raw, null, 2));
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Agent request failed.");
    } finally {
      setChatLoading(false);
    }
  }, [appId, chatMessage]);

  const envKeys = displayConfig.envKeys.length ? displayConfig.envKeys.join(", ") : "None";
  const headerKeys = displayConfig.headerKeys.length ? displayConfig.headerKeys.join(", ") : "None";

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      handleUploadFiles(event.dataTransfer.files);
    },
    [handleUploadFiles]
  );

  const tabContent = (() => {
    switch (activeTab) {
      case "knowledge":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload knowledge base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="rounded-md border border-dashed border-border-default bg-background-surface/60 p-6 text-sm text-text-secondary"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onDrop}
                >
                  <div className="text-text-primary">Drop files here</div>
                  <div className="text-xs text-text-muted">PDF, markdown, or text files up to 10MB.</div>
                  <input
                    type="file"
                    multiple
                    className="mt-3 text-xs"
                    onChange={(event) => handleUploadFiles(event.target.files)}
                  />
                </div>
                {uploadError && <div className="text-sm text-red-400">{uploadError}</div>}
                {uploading && <div className="text-xs text-text-muted">Processing upload...</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uploaded files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-text-secondary">
                {knowledgeFiles.length === 0 ? (
                  <div>No knowledge files uploaded yet.</div>
                ) : (
                  <div className="space-y-2">
                    {knowledgeFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-default bg-background-surface px-3 py-2"
                      >
                        <div>
                          <div className="text-text-primary text-sm">{file.name}</div>
                          <div className="text-xs text-text-muted">
                            {formatBytes(file.size)} · Updated {formatTimestamp(file.updatedAt)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeleteFile(file.name)}
                          disabled={uploading}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "chat":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test chat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-border-default bg-background-surface p-4 text-xs text-text-secondary">
                  <div className="text-text-primary font-medium">Endpoint</div>
                  <div>{displayConfig.endpointUrl || "Not configured"}</div>
                </div>
                <div className="space-y-3">
                  <textarea
                    className="min-h-[90px] w-full rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-primary"
                    value={chatMessage}
                    onChange={(event) => setChatMessage(event.target.value)}
                    placeholder="Ask your agent a question..."
                    aria-label="Agent chat message"
                  />
                  <Button type="button" onClick={handleSendChat} disabled={!displayConfig.endpointUrl} isLoading={chatLoading}>
                    Send message
                  </Button>
                  {chatError && <div className="text-sm text-red-400">{chatError}</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chatLog.length === 0 ? (
                  <div className="text-sm text-text-secondary">No messages yet.</div>
                ) : (
                  <div className="space-y-3">
                    {chatLog.map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "rounded-md border border-border-default px-3 py-2 text-sm",
                          entry.role === "user"
                            ? "bg-background-surface text-text-primary"
                            : "bg-background-card text-text-secondary"
                        )}
                      >
                        <div className="text-xs text-text-muted mb-1">
                          {entry.role === "user" ? "You" : "Agent"} · {formatTimestamp(entry.timestamp)}
                        </div>
                        <div>{entry.content}</div>
                      </div>
                    ))}
                  </div>
                )}
                {rawResponse && (
                  <details className="rounded-md border border-border-default bg-background-surface p-3 text-xs text-text-secondary">
                    <summary className="cursor-pointer text-text-primary">Raw response</summary>
                    <pre className="mt-2 whitespace-pre-wrap">{rawResponse}</pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case "debug":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Runtime status</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-text-secondary space-y-2">
                <div>
                  Status: <CvmStateIndicator appId={appId} initialStatus={status} />
                </div>
                <div>
                  Request format: <span className="text-text-primary">{displayConfig.requestFormat}</span>
                </div>
              </CardContent>
            </Card>
            <CvmLogs appId={appId} publicLogs={publicLogs} publicSysinfo={publicSysinfo} />
          </div>
        );
      case "config":
      default:
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Display name</label>
                    <Input
                      value={displayConfig.name}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...(prev ?? displayConfig),
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Model</label>
                    <Input
                      value={displayConfig.model ?? ""}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...(prev ?? displayConfig),
                          model: event.target.value,
                        }))
                      }
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-text-secondary">Endpoint URL</label>
                    <Input
                      value={displayConfig.endpointUrl ?? ""}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...(prev ?? displayConfig),
                          endpointUrl: event.target.value,
                        }))
                      }
                      placeholder="https://<app-id>.your-domain/chat"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-text-secondary">Description</label>
                    <textarea
                      className="min-h-[72px] w-full rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-primary"
                      value={displayConfig.description ?? ""}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...(prev ?? displayConfig),
                          description: event.target.value,
                        }))
                      }
                      placeholder="What does this agent do?"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-text-secondary">System prompt</label>
                    <textarea
                      className="min-h-[120px] w-full rounded-md border border-border-default bg-background-surface p-3 text-sm text-text-primary"
                      value={displayConfig.prompt ?? ""}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...(prev ?? displayConfig),
                          prompt: event.target.value,
                        }))
                      }
                      placeholder="You are a helpful agent..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Request format</label>
                    <select
                      value={displayConfig.requestFormat}
                      onChange={(event) =>
                        setConfig((prev) => ({
                          ...(prev ?? displayConfig),
                          requestFormat: event.target.value as "generic" | "openai",
                        }))
                      }
                      className="h-10 w-full rounded-md border border-border-default bg-background-surface px-3 text-sm text-text-secondary"
                    >
                      <option value="generic">Generic JSON (message, prompt)</option>
                      <option value="openai">OpenAI-compatible (messages[])</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-background-card/60">
                    <CardHeader>
                      <CardTitle>Environment variables</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-text-muted">Saved keys: {envKeys}</div>
                      <label className="flex items-center gap-2 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={applyEnv}
                          onChange={(event) => setApplyEnv(event.target.checked)}
                        />
                        Replace env vars
                      </label>
                      <textarea
                        className="min-h-[120px] w-full rounded-md border border-border-default bg-background-surface p-3 text-xs text-text-primary"
                        value={envText}
                        onChange={(event) => setEnvText(event.target.value)}
                        placeholder={secretsEnabled ? "OPENAI_API_KEY=..." : "Secrets storage disabled"}
                        disabled={!secretsEnabled}
                        aria-label="Environment variables"
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-background-card/60">
                    <CardHeader>
                      <CardTitle>Request headers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-text-muted">Saved headers: {headerKeys}</div>
                      <label className="flex items-center gap-2 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={applyHeaders}
                          onChange={(event) => setApplyHeaders(event.target.checked)}
                        />
                        Replace headers
                      </label>
                      <textarea
                        className="min-h-[120px] w-full rounded-md border border-border-default bg-background-surface p-3 text-xs text-text-primary"
                        value={headerText}
                        onChange={(event) => setHeaderText(event.target.value)}
                        placeholder={secretsEnabled ? "Authorization=Bearer ..." : "Secrets storage disabled"}
                        disabled={!secretsEnabled}
                        aria-label="Request headers"
                      />
                    </CardContent>
                  </Card>
                </div>

                {!secretsEnabled && (
                  <div className="text-xs text-text-muted">
                    Secrets are disabled. Set NEXIS_CONSOLE_ENCRYPTION_KEY to store env vars or headers.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleSaveConfig} isLoading={saving}>
                    Save configuration
                  </Button>
                  {saveStatus && <div className="text-xs text-text-muted">{saveStatus}</div>}
                  {saveError && <div className="text-xs text-red-400">{saveError}</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  })();

  return (
    <div className="space-y-6">
      {loadError && (
        <Card>
          <CardHeader>
            <CardTitle>Agent storage service unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-text-secondary">{loadError}</CardContent>
        </Card>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{displayConfig.name}</h1>
          <p className="text-text-secondary mt-1">Agent workspace for CVM {cvmName}.</p>
          <div className="text-xs text-text-muted mt-2 font-mono">App ID: {appId}</div>
        </div>
        <div className="rounded-md border border-border-default bg-background-surface px-3 py-2 text-sm text-text-secondary">
          <CvmStateIndicator appId={appId} initialStatus={status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={activeTab === tab.id ? "primary" : "secondary"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {tabContent}
    </div>
  );
}
