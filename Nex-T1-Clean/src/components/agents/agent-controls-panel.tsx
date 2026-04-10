"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, Settings2 } from "lucide-react";
import { toast } from "sonner";

import type { AgentDetail, AgentVersion } from "@/lib/agents/types";
import { DeployAgentButton } from "@/components/agents/deploy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AgentControlsPanelProps = {
  agent: AgentDetail["agent"];
  versions: AgentVersion[];
  canManage: boolean;
  canViewPrivateConfig: boolean;
};

type ListingVisibility = "public" | "private" | "unlisted";

export function AgentControlsPanel({ agent, versions, canManage, canViewPrivateConfig }: AgentControlsPanelProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);

  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(agent.avatarUrl ?? "");
  const [visibility, setVisibility] = useState<ListingVisibility>(agent.visibility);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt ?? "");

  const allowSensitiveEdits = canManage && (agent.visibility !== "private" || canViewPrivateConfig);

  useEffect(() => {
    if (!editOpen) return;
    setName(agent.name);
    setDescription(agent.description ?? "");
    setAvatarUrl(agent.avatarUrl ?? "");
    setVisibility(agent.visibility);
    setSystemPrompt(agent.systemPrompt ?? "");
  }, [agent.avatarUrl, agent.description, agent.name, agent.systemPrompt, agent.visibility, editOpen]);

  const deployVersions = useMemo(
    () => versions.map((version) => ({ id: version.id, createdAt: version.createdAt })),
    [versions],
  );

  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [baseConfig, setBaseConfig] = useState<Record<string, UntypedJson> | null>(null);
  const [toolIdsText, setToolIdsText] = useState<string>("");
  const [savingTools, setSavingTools] = useState(false);

  const loadToolsConfig = useCallback(async () => {
    try {
      setToolsLoading(true);
      setToolsError(null);
      const response = await fetch(`/api/agents/${agent.id}/versions`, { method: "GET" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message ?? payload?.error ?? `Unable to load version (${response.status})`);
      }
      const config = payload?.version?.config;
      if (!config || typeof config !== "object") {
        setBaseConfig(null);
        setToolIdsText("");
        return;
      }
      setBaseConfig(config as Record<string, UntypedJson>);
      const toolsRaw = (config).tools;
      const toolIds = Array.isArray(toolsRaw)
        ? toolsRaw
            .map((tool) => {
              if (typeof tool === "string") return tool;
              if (tool && typeof tool === "object" && typeof tool.id === "string") return tool.id;
              return null;
            })
            .filter(Boolean)
        : [];
      setToolIdsText(toolIds.join("\n"));
    } catch (error) {
      setToolsError(error instanceof Error ? error.message : "Unable to load tools");
      setBaseConfig(null);
      setToolIdsText("");
    } finally {
      setToolsLoading(false);
    }
  }, [agent.id]);

  if (!canManage) return null;

  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base text-white">Agent controls</CardTitle>
          <p className="text-xs text-muted-foreground/70">Edit settings, manage tools, and deploy versions.</p>
        </div>
        <div className="flex items-center gap-2">
          {deployVersions.length > 0 ? <DeployAgentButton agentId={agent.id} versions={deployVersions} /> : null}
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/agent-spend">Spend policy</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit3 className="h-4 w-4" />
              Edit agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>Edit agent</DialogTitle>
              <DialogDescription>Updates are enforced server-side and may be redacted for private agents.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="agent-name">Name</Label>
                <Input id="agent-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-black/40" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-description">Description</Label>
                <Textarea
                  id="agent-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-black/40"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-avatar-url">Avatar URL</Label>
                <Input
                  id="agent-avatar-url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://... or orb:#hex,#hex"
                  className="bg-black/40"
                />
                <p className="text-xs text-muted-foreground/70">
                  Supports `https://` URLs and `orb:#hex,#hex` presets.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-visibility">Visibility</Label>
                <Select value={visibility} onValueChange={(value) => setVisibility(value as ListingVisibility)}>
                <SelectTrigger id="agent-visibility" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {allowSensitiveEdits ? (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="agent-prompt">System prompt</Label>
                    {agent.visibility === "private" ? (
                      <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
                        Private
                      </Badge>
                    ) : null}
                  </div>
                  <Textarea
                    id="agent-prompt"
                    rows={6}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="bg-black/40 font-mono text-xs"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/70">
                  System prompt editing is restricted for private agents (owner/admin only).
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={savingAgent}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setSavingAgent(true);
                    const body: Record<string, UntypedJson> = {
                      name: name.trim(),
                      description: description.trim() ? description.trim() : null,
                      avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
                      visibility,
                    };
                    if (allowSensitiveEdits) {
                      body.systemPrompt = systemPrompt.trim() ? systemPrompt : null;
                    }
                    const response = await fetch(`/api/agents/${agent.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      throw new Error(payload?.message ?? payload?.error ?? `Update failed (${response.status})`);
                    }
                    toast.success("Agent updated");
                    setEditOpen(false);
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to update agent.");
                  } finally {
                    setSavingAgent(false);
                  }
                }}
                disabled={savingAgent || !name.trim()}
              >
                {savingAgent ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={toolsOpen}
          onOpenChange={(next) => {
            setToolsOpen(next);
            if (next) void loadToolsConfig();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={!allowSensitiveEdits}>
              <Settings2 className="h-4 w-4" />
              Edit tools
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>Edit tool allowlist</DialogTitle>
              <DialogDescription>
                Updates create a new agent version. Tool IDs should match your configured tool registry.
              </DialogDescription>
            </DialogHeader>

            {toolsLoading ? (
              <div className="py-8 text-sm text-muted-foreground">Loading latest version…</div>
            ) : toolsError ? (
              <div className="py-8 text-sm text-destructive">{toolsError}</div>
            ) : !baseConfig ? (
              <div className="py-8 text-sm text-muted-foreground">No version config found for this agent.</div>
            ) : (
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="tool-ids">Allowed tools (one per line)</Label>
                  <Textarea
                    id="tool-ids"
                    rows={8}
                    value={toolIdsText}
                    onChange={(e) => setToolIdsText(e.target.value)}
                    className="bg-black/40 font-mono text-xs"
                    disabled={savingTools}
                  />
                </div>
                <p className="text-xs text-muted-foreground/70">
                  This updates `config.tools` and keeps other config fields intact.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="ghost" onClick={() => setToolsOpen(false)} disabled={savingTools}>
                Close
              </Button>
              <Button
                onClick={async () => {
                  if (!baseConfig) return;
                  try {
                    setSavingTools(true);
                    const toolIds = toolIdsText
                      .split(/\n|,/)
                      .map((value) => value.trim())
                      .filter(Boolean);
                    const nextConfig: Record<string, UntypedJson> = { ...baseConfig, tools: toolIds.map((id) => ({ id })) };

                    const response = await fetch(`/api/agents/${agent.id}/versions`, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ config: nextConfig }),
                    });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      throw new Error(payload?.message ?? payload?.error ?? `Version update failed (${response.status})`);
                    }
                    toast.success("New version published", { description: "Deploy the new version to apply changes." });
                    setToolsOpen(false);
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to update tools.");
                  } finally {
                    setSavingTools(false);
                  }
                }}
                disabled={savingTools || toolsLoading || Boolean(toolsError) || !baseConfig}
              >
                {savingTools ? "Publishing…" : "Publish version"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
