"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, ChevronRight, Globe2, Loader2, Mic2, Save, Sparkles, Workflow } from "lucide-react";
import { toast } from "sonner";
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

import {
  SettingsFeaturePill,
  SettingsMainColumn,
  SettingsPage,
  SettingsPageBody,
  SettingsPageHeader,
  SettingsSideColumn,
} from "@/components/settings-v2/primitives/page";
import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Button } from "@/components/settings/shared/settings-button";
import { VoicePicker } from "@/components/ui/voice-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseAgentDetailResponse, parseAgentListResponse } from "@/lib/agents/types";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { cn } from "@/lib/utils";

type VoiceSummary = {
  voiceId: string;
  name: string;
  previewUrl?: string | null;
  labels?: Record<string, string | undefined> | null;
};

const MODEL_OPTIONS = [
  { id: "openai/gpt-5.4", label: "GPT-5.4", description: "Primary reasoning model for high-stakes execution." },
  { id: "openai/gpt-5.3-chat", label: "GPT-5.4 (Compat Alias)", description: "Legacy stored alias that runtime upgrades to GPT-5.4." },
  { id: "openai/gpt-4o", label: "GPT-4o", description: "Fast multimodal fallback." },
] as const;

const LANGUAGE_OPTIONS = [
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "es-ES", label: "Spanish" },
  { id: "pt-BR", label: "Portuguese (BR)" },
  { id: "ja-JP", label: "Japanese" },
  { id: "zh-CN", label: "Chinese (Simplified)" },
] as const;

function describeVoice(voice: VoiceSummary) {
  return [voice.labels?.accent, voice.labels?.gender, voice.labels?.age].filter(Boolean).join(" · ") || "Voice preset";
}

function getVisibleVoices(voices: VoiceSummary[], selectedVoiceId: string) {
  const selectedVoice = voices.find((voice) => voice.voiceId === selectedVoiceId);
  const remainingVoices = voices.filter((voice) => voice.voiceId !== selectedVoiceId);
  return selectedVoice ? [selectedVoice, ...remainingVoices].slice(0, 8) : voices.slice(0, 8);
}

function parseVoicesPayload(payload: UntypedJson): VoiceSummary[] {
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, UntypedJson>)
      : {};

  const topLevel = Array.isArray(record.voices) ? record.voices : [];
  const nestedData =
    record.data && typeof record.data === "object" && !Array.isArray(record.data)
      ? ((record.data as Record<string, UntypedJson>).voices ?? [])
      : [];

  const voices = Array.isArray(topLevel) && topLevel.length > 0 ? topLevel : Array.isArray(nestedData) ? nestedData : [];

  const parsed: VoiceSummary[] = [];

  for (const item of voices) {
    const voice =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, UntypedJson>)
        : null;

    if (!voice || typeof voice.voiceId !== "string" || typeof voice.name !== "string") {
      continue;
    }

    parsed.push({
      voiceId: voice.voiceId,
      name: voice.name,
      previewUrl: typeof voice.previewUrl === "string" ? voice.previewUrl : null,
      labels:
        voice.labels && typeof voice.labels === "object" && !Array.isArray(voice.labels)
          ? (voice.labels as Record<string, string | undefined>)
          : null,
    });
  }

  return parsed;
}

async function fetchAgents() {
  const response = await fetch("/api/agents/list", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Failed to load agents");
    throw new Error(detail || "Failed to load agents");
  }

  return parseAgentListResponse((await response.json()) as UntypedJson);
}

async function fetchAgentDetail(agentId: string) {
  const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Failed to load agent");
    throw new Error(detail || "Failed to load agent");
  }

  return parseAgentDetailResponse((await response.json()) as UntypedJson);
}

async function fetchVoices() {
  const response = await fetch("/api/elevenlabs/voices", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Failed to load voices");
    throw new Error(detail || "Failed to load voices");
  }

  return parseVoicesPayload((await response.json()) as UntypedJson);
}

export function SettingsAgentStudioSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: profile } = useProfileAggregate();

  const agentsQuery = useQuery({
    queryKey: ["settings-agent-studio", "agents"],
    queryFn: fetchAgents,
    staleTime: 30_000,
  });

  const requestedAgentId = searchParams.get("agentId")?.trim() ?? null;
  const selectedAgentId = requestedAgentId ?? agentsQuery.data?.[0]?.id ?? null;

  const detailQuery = useQuery({
    queryKey: ["settings-agent-studio", "detail", selectedAgentId],
    queryFn: () => fetchAgentDetail(selectedAgentId!),
    enabled: Boolean(selectedAgentId),
  });

  const voicesQuery = useQuery({
    queryKey: ["settings-agent-studio", "voices"],
    queryFn: fetchVoices,
    staleTime: 5 * 60_000,
  });

  const metadata =
    profile?.identity.metadata && typeof profile.identity.metadata === "object" && !Array.isArray(profile.identity.metadata)
      ? profile.identity.metadata
      : {};

  const voiceId =
    typeof metadata.voiceId === "string"
      ? metadata.voiceId
      : typeof metadata.elevenlabsVoiceId === "string"
        ? metadata.elevenlabsVoiceId
        : null;

  const assistantModel =
    typeof metadata.assistantModel === "string" && metadata.assistantModel.trim().length > 0
      ? metadata.assistantModel
      : MODEL_OPTIONS[0].id;

  const assistantLanguage =
    typeof metadata.assistantLanguage === "string" && metadata.assistantLanguage.trim().length > 0
      ? metadata.assistantLanguage
      : profile?.identity.locale ?? LANGUAGE_OPTIONS[0].id;
  const selectedVoiceValue = voiceId ?? "";

  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftModel, setDraftModel] = useState<string>(MODEL_OPTIONS[0].id);
  const [draftLanguage, setDraftLanguage] = useState<string>(LANGUAGE_OPTIONS[0].id);
  const [draftVoiceId, setDraftVoiceId] = useState("");

  const updateAgentMutation = useMutation({
    mutationFn: async (systemPrompt: string) => {
      if (!selectedAgentId) {
        throw new Error("Select an agent first.");
      }

      const response = await fetch(`/api/agents/${encodeURIComponent(selectedAgentId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt }),
      });

      const payload = (await response.json().catch(() => null)) as Record<string, UntypedJson> | null;
      if (!response.ok) {
        throw new Error(
          (typeof payload?.message === "string" ? payload.message : null) ??
            (typeof payload?.error === "string" ? payload.error : null) ??
            `Update failed (${response.status})`,
        );
      }
    },
    onSuccess: async () => {
      toast.success("Agent prompt updated");
      await queryClient.invalidateQueries({ queryKey: ["settings-agent-studio", "detail", selectedAgentId] });
      await queryClient.invalidateQueries({ queryKey: ["settings-agent-studio", "agents"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update agent");
    },
  });

  const updateAssistantPreferencesMutation = useMutation({
    mutationFn: async (payload: { nextModel: string; nextLanguage: string; nextVoiceId: string | null }) => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...metadata,
            assistantModel: payload.nextModel,
            assistantLanguage: payload.nextLanguage,
            voiceId: payload.nextVoiceId,
            elevenlabsVoiceId: payload.nextVoiceId,
          },
          elevenlabsVoiceId: payload.nextVoiceId,
        }),
      });

      const result = (await response.json().catch(() => null)) as Record<string, UntypedJson> | null;
      if (!response.ok) {
        throw new Error(
          (typeof result?.message === "string" ? result.message : null) ??
            (typeof result?.error === "string" ? result.error : null) ??
            `Update failed (${response.status})`,
        );
      }
    },
    onSuccess: async () => {
      toast.success("Assistant preferences updated");
      await queryClient.invalidateQueries({ queryKey: ["profile-aggregate"] });
      await queryClient.invalidateQueries({ queryKey: ["preferred-voice-id"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update assistant preferences");
    },
  });

  const activeView = searchParams.get("view") ?? "studio";

  useEffect(() => {
    if (requestedAgentId || !agentsQuery.data?.[0]?.id || !pathname) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("agentId", agentsQuery.data[0].id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [agentsQuery.data, pathname, requestedAgentId, router, searchParams]);

  useEffect(() => {
    setDraftPrompt(detailQuery.data?.agent.systemPrompt ?? "");
  }, [detailQuery.data?.agent.id, detailQuery.data?.agent.systemPrompt]);

  useEffect(() => {
    setDraftModel(assistantModel);
    setDraftLanguage(assistantLanguage);
    setDraftVoiceId(selectedVoiceValue);
  }, [assistantLanguage, assistantModel, selectedVoiceValue]);

  if (agentsQuery.isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--settings-foreground-muted)]" />
      </div>
    );
  }

  if (agentsQuery.error) {
    return (
      <SettingsPanel title="Agent Studio" description="We couldn't load your deployable agents.">
        <p className="text-sm text-rose-300">
          {agentsQuery.error instanceof Error ? agentsQuery.error.message : "Unable to load agents."}
        </p>
      </SettingsPanel>
    );
  }

  if (!selectedAgentId || !agentsQuery.data || agentsQuery.data.length === 0) {
    return (
      <SettingsPanel title="Agent Studio" description="Create or deploy an agent to unlock prompt and orchestration controls.">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-[var(--settings-foreground-muted)]">No agents found for this workspace.</p>
          <Link
            href="/agents/new"
            className="inline-flex h-10 items-center rounded-full border border-[var(--settings-border)]/8 px-4 text-sm text-[var(--settings-foreground-strong)] hover:bg-[var(--settings-elevated)]"
          >
            Create agent
          </Link>
        </div>
      </SettingsPanel>
    );
  }

  const activeAgent = detailQuery.data?.agent;
  const activeVersions = detailQuery.data?.versions ?? [];
  const activeDeployments = detailQuery.data?.deployments ?? [];
  const voiceChoices = getVisibleVoices(voicesQuery.data ?? [], draftVoiceId);
  const activeModelOption = MODEL_OPTIONS.find((option) => option.id === draftModel) ?? MODEL_OPTIONS[0];
  const activeLanguageOption = LANGUAGE_OPTIONS.find((option) => option.id === draftLanguage) ?? LANGUAGE_OPTIONS[0];
  const updateSelectedAgent = (agentId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("agentId", agentId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <SettingsPage className="space-y-8">
      <SettingsPageHeader
        title="Agent"
        badge={<SettingsFeaturePill />}
        description="Prompt, voice, and orchestration controls for deployed agents, tuned to the new editor-plus-runtime settings layout."
        action={
          agentsQuery.data.length > 1 ? (
            <div className="min-w-[230px]">
              <Select value={selectedAgentId} onValueChange={updateSelectedAgent}>
                <SelectTrigger className="h-[38px] rounded-full border-white/[0.153] bg-transparent px-4 text-left">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agentsQuery.data.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
      />

      <SettingsPageBody>
        <SettingsMainColumn>
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium leading-5 text-[var(--settings-foreground-strong)] underline underline-offset-4">
                    System prompt
                  </span>
                  <span className="text-[var(--settings-foreground-subtle)]">↗</span>
                </div>
              </div>
              <button
                type="button"
                disabled={detailQuery.isLoading || updateAgentMutation.isPending || !selectedAgentId}
                onClick={() => {
                  updateAgentMutation.mutate(draftPrompt);
                }}
                className="inline-flex size-8 items-center justify-center rounded-[8px] border border-[var(--settings-border-strong)] bg-[var(--settings-surface)] text-[var(--settings-foreground-strong)] transition-colors hover:bg-[var(--settings-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Save system prompt"
              >
                {updateAgentMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
              </button>
            </div>

            {detailQuery.isLoading ? (
              <div className="flex min-h-[372px] items-center justify-center rounded-[16px] border border-[var(--settings-border-soft)] bg-black/30">
                <Loader2 className="size-5 animate-spin text-[var(--settings-foreground-muted)]" />
              </div>
            ) : detailQuery.error ? (
              <div className="rounded-[16px] border border-rose-500/25 bg-rose-500/10 px-4 py-4 text-sm text-rose-300">
                {detailQuery.error instanceof Error ? detailQuery.error.message : "Unable to load the selected agent."}
              </div>
            ) : (
              <section className="overflow-hidden rounded-[16px] border border-[var(--settings-border-soft)]">
                <div className="relative">
                  <Textarea
                    key={activeAgent?.id}
                    value={draftPrompt}
                    rows={18}
                    className="min-h-[372px] rounded-none border-0 bg-[#0f0f10] px-5 py-8 font-[family-name:var(--font-inter)] text-[14px] leading-5 text-[var(--settings-foreground-strong)] shadow-none focus-visible:ring-0"
                    onChange={(event) => {
                      setDraftPrompt(event.target.value);
                    }}
                  />
                  <div className="pointer-events-none absolute right-[13px] top-[13px] inline-flex size-8 items-center justify-center opacity-30">
                    <ChevronRight className="size-4 -rotate-45 text-[var(--settings-foreground-strong)]" />
                  </div>
                </div>
                <div className="flex min-h-14 flex-wrap items-center justify-end gap-3 border-t border-[var(--settings-border-soft)] bg-[#1c1c1d] px-4 py-3">
                  <div className="mr-auto flex items-center gap-1 text-sm text-[#a6a6ae]">
                    <span>Type</span>
                    <span className="rounded-[8px] border border-[var(--settings-border-soft)] bg-[#242426] px-1.5 py-0.5 font-medium text-[#a6a6ae]">
                      {"{{"}
                    </span>
                    <span>to add variables</span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-full border border-[var(--settings-border)]/8 px-3 text-xs text-[#a6a6ae] underline underline-offset-4 hover:bg-[var(--settings-elevated)]"
                  >
                    Default personality
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-[8px] border border-[var(--settings-border-strong)] bg-[var(--settings-surface)] px-3 text-xs text-[var(--settings-foreground-strong)] hover:bg-[var(--settings-elevated)]"
                  >
                    Set timezone
                  </button>
                </div>
              </section>
            )}
          </div>

          <SettingsPanel title="Deployment surface" description="Current release posture and version inventory for the selected agent.">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[10px] border border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] px-4 py-4">
                <div className="flex items-center gap-2 text-[var(--settings-foreground-subtle)]">
                  <Bot className="size-4" />
                  <span className="text-xs uppercase tracking-[0.14em]">Visibility</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-[var(--settings-foreground-strong)]">
                  {activeAgent?.visibility ?? "—"}
                </p>
              </div>
              <div className="rounded-[10px] border border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] px-4 py-4">
                <div className="flex items-center gap-2 text-[var(--settings-foreground-subtle)]">
                  <Workflow className="size-4" />
                  <span className="text-xs uppercase tracking-[0.14em]">Deployments</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-[var(--settings-foreground-strong)]">
                  {activeDeployments.length}
                </p>
              </div>
              <div className="rounded-[10px] border border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] px-4 py-4">
                <div className="flex items-center gap-2 text-[var(--settings-foreground-subtle)]">
                  <Sparkles className="size-4" />
                  <span className="text-xs uppercase tracking-[0.14em]">Versions</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-[var(--settings-foreground-strong)]">
                  {activeVersions.length}
                </p>
              </div>
            </div>

            {activeDeployments.length > 0 ? (
              <div className="mt-4 space-y-3">
                {activeDeployments.slice(0, 3).map((deployment) => (
                  <div
                    key={deployment.id}
                    className="rounded-[10px] border border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                          {deployment.teeProvider}
                        </p>
                        <p className="mt-1 text-xs text-[var(--settings-foreground-muted)]">
                          {deployment.endpointUrl ?? "No endpoint URL available"}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--settings-border)]/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--settings-foreground-subtle)]">
                        {deployment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--settings-foreground-muted)]">
                No deployments registered yet. Launch this agent to inspect runtime endpoints.
              </p>
            )}
          </SettingsPanel>
        </SettingsMainColumn>

        <SettingsSideColumn>
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--settings-foreground-subtle)]">
                {activeView === "assistant" ? "Assistant runtime" : "Agent runtime"}
              </p>
              <h2 className="text-lg font-medium text-[var(--settings-foreground-strong)]">Voice, language, and model</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[var(--settings-foreground-strong)]">
                  <Mic2 className="size-4" />
                  <Label htmlFor="assistant-voice" className="text-sm text-[var(--settings-foreground-strong)]">
                    Voices
                  </Label>
                </div>
                <p className="text-sm text-[var(--settings-foreground-muted)]">
                  Select the ElevenLabs voices you want this agent to use.
                </p>
              </div>

              {voicesQuery.isLoading ? (
                <div className="flex h-10 items-center rounded-[10px] border border-[var(--settings-border)]/8 bg-[var(--settings-elevated)] px-3 text-sm text-[var(--settings-foreground-muted)]">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading voices...
                </div>
              ) : voicesQuery.error ? (
                <div className="rounded-[10px] border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {voicesQuery.error instanceof Error ? voicesQuery.error.message : "Voice catalog unavailable."}
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-[10px] border border-[var(--settings-border)]/8 bg-[var(--settings-panel)]">
                    {voiceChoices.map((voice, index) => {
                      const isSelected = voice.voiceId === draftVoiceId;
                      return (
                        <button
                          key={voice.voiceId}
                          type="button"
                          onClick={() => {
                            setDraftVoiceId(voice.voiceId);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors",
                            index > 0 && "border-t border-[var(--settings-border)]/8",
                            isSelected ? "bg-[color:rgba(255,255,255,0.03)]" : "hover:bg-[var(--settings-elevated)]",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--settings-foreground-strong)]">{voice.name}</p>
                            <p className="mt-1 truncate text-xs text-[var(--settings-foreground-muted)]">{describeVoice(voice)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <span className="rounded-full border border-[var(--settings-border)]/8 bg-[color:rgba(243,243,255,0.09)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--settings-foreground-strong)]">
                                Primary
                              </span>
                            ) : null}
                            {isSelected ? (
                              <Check className="size-4 text-[var(--settings-accent)]" />
                            ) : (
                              <ChevronRight className="size-4 text-[var(--settings-foreground-subtle)]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <VoicePicker
                    voices={((voicesQuery.data ?? []) as ElevenLabs.Voice[])}
                    value={draftVoiceId}
                    onValueChange={setDraftVoiceId}
                    placeholder="Browse full catalog"
                    className="border-[var(--settings-border)]/8 bg-[var(--settings-elevated)]"
                  />
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[var(--settings-foreground-strong)]">
                  <Globe2 className="size-4" />
                  <Label htmlFor="assistant-language" className="text-sm text-[var(--settings-foreground-strong)]">
                    Language
                  </Label>
                </div>
                <p className="text-sm text-[var(--settings-foreground-muted)]">
                  Choose the default language used for assistant replies and spoken interactions.
                </p>
              </div>
              <Select value={draftLanguage} onValueChange={setDraftLanguage}>
                <SelectTrigger id="assistant-language" className="border-[var(--settings-border)]/8 bg-[var(--settings-elevated)]">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--settings-foreground-muted)]">
                Current default: <span className="text-[var(--settings-foreground-strong)]">{activeLanguageOption.label}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[var(--settings-foreground-strong)]">
                  <Sparkles className="size-4" />
                  <Label htmlFor="assistant-model" className="text-sm text-[var(--settings-foreground-strong)]">
                    LLM
                  </Label>
                </div>
                <p className="text-sm text-[var(--settings-foreground-muted)]">
                  Select which model powers reasoning, conversation, and tool planning for this agent.
                </p>
              </div>
              <Select value={draftModel} onValueChange={setDraftModel}>
                <SelectTrigger id="assistant-model" className="border-[var(--settings-border)]/8 bg-[var(--settings-elevated)]">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--settings-foreground-muted)]">{activeModelOption.description}</p>
            </div>

            <Button
              type="button"
              disabled={updateAssistantPreferencesMutation.isPending}
              onClick={() => {
                updateAssistantPreferencesMutation.mutate({
                  nextModel: draftModel,
                  nextLanguage: draftLanguage,
                  nextVoiceId: draftVoiceId.trim() || null,
                });
              }}
              className="w-full rounded-[10px]"
            >
              {updateAssistantPreferencesMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save runtime preferences
            </Button>
          </div>
        </SettingsSideColumn>
      </SettingsPageBody>
    </SettingsPage>
  );
}
