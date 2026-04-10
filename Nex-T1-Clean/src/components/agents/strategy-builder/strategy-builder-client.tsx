"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Rocket } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Node, Edge } from "@xyflow/react";

import { StrategyDraft, useStrategyBuilderStore } from "@/lib/strategies/store";
import type { StrategySnapshot } from "@/lib/strategies/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StrategyDraftList } from "@/components/agents/strategy-builder/draft-list";
import { syncBackendSessions } from "@/components/providers/supabase-auth-provider";
import {
  createClient as createSupabaseClient,
  type SupabaseBrowserClient,
} from "@/lib/supabase/client";
import { useActiveAccount } from "@/hooks/user/use-active-account";
import {
  fetchUserOrganizations,
  type UserOrganization,
} from "@/lib/orgs/client";

import { logger } from "@/lib/logger";
// Dynamic import for the Flow Editor to avoid SSR issues with React Flow
const StrategyFlowEditor = dynamic(
  () =>
    import("@/components/agents/strategy-builder/flow-editor/strategy-flow-editor").then(
      (mod) => ({
        default: mod.StrategyFlowEditor,
      }),
    ),
  {
    ssr: false,
    loading: () => (
      <Card className="flex h-[700px] items-center justify-center border-[var(--settings-border-soft)] bg-[var(--settings-card-bg)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    ),
  },
);

type ApiDraftRow = {
  id: string;
  org_id: string;
  name: string;
  prompt: string | null;
  template_id: string | null;
  blockly_xml: string | null; // Kept for legacy compatibility
  workflow?: UntypedJson; // Contains reactFlow nodes/edges + agnostic workflow
  summary?: UntypedJson;
  created_at: string;
  last_saved_at: string | null;
};

type AutoSaveState = "idle" | "saving" | "saved" | "error";

const UUID_PATTERN =
  /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;

function normalizeOrgId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!UUID_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

const initialNodes: Node[] = [
  {
    id: "start_1",
    type: "strategy_start",
    position: { x: 250, y: 50 },
    data: { label: "Start" },
  },
];

export function StrategyBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftParam = searchParams?.get("draft") ?? null;
  const { accountId, setAccountId } = useActiveAccount();

  const drafts = useStrategyBuilderStore((state) => state.drafts);
  const currentDraftId = useStrategyBuilderStore(
    (state) => state.currentDraftId,
  );
  const setCurrentDraft = useStrategyBuilderStore(
    (state) => state.setCurrentDraft,
  );
  const updateDraft = useStrategyBuilderStore((state) => state.updateDraft);
  const removeDraft = useStrategyBuilderStore((state) => state.removeDraft);
  const hydrateDrafts = useStrategyBuilderStore((state) => state.hydrate);
  const upsertDraft = useStrategyBuilderStore((state) => state.upsertDraft);

  const [isLoading, setIsLoading] = useState(true);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");
  const [lastSnapshot, setLastSnapshot] = useState<
    StrategySnapshot | undefined
  >();
  // const [isRealtimeReady, setIsRealtimeReady] = useState(false);

  // Re-render key for editor when draft changes
  const [editorKey, setEditorKey] = useState(0);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeOrgIdRef = useRef<string | null>(null);
  const supabaseRef = useRef<SupabaseBrowserClient | null>(null);
  const sessionSyncRef = useRef<Promise<boolean> | null>(null);
  const sessionErrorNotifiedRef = useRef(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);

  const currentDraft = useMemo<StrategyDraft | undefined>(() => {
    if (!drafts.length) return undefined;
    return drafts.find((draft) => draft.id === currentDraftId) ?? drafts[0];
  }, [drafts, currentDraftId]);

  useEffect(() => {
    activeOrgIdRef.current = accountId ?? null;
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadOrganizations() {
      const client = createSupabaseClient();
      const { data } = await client.auth.getSession();
      const orgs = await fetchUserOrganizations({
        signal: controller.signal,
        accessToken: data.session?.access_token,
      });
      const sanitizedOrgs = orgs
        .map((org) => {
          const normalized = normalizeOrgId(org.id);
          if (!normalized) return null;
          return { ...org, id: normalized };
        })
        .filter((org): org is UserOrganization => Boolean(org));
      if (cancelled) return;
      setOrganizations(sanitizedOrgs);
      if (!accountId && sanitizedOrgs.length > 0) {
        const first = sanitizedOrgs[0];
        setAccountId(first.id);
        activeOrgIdRef.current = first.id;
      }
    }
    void loadOrganizations();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accountId, setAccountId]);

  const ensureOrgId = useCallback(async (): Promise<string | null> => {
    const active = normalizeOrgId(activeOrgIdRef.current);
    if (active) {
      activeOrgIdRef.current = active;
      if (active !== accountId) {
        setAccountId(active);
      }
      return active;
    }
    if (activeOrgIdRef.current && !active) {
      setAccountId(null);
      activeOrgIdRef.current = null;
    }

    if (organizations.length > 0) {
      const candidate = normalizeOrgId(organizations[0]?.id);
      if (candidate) {
        setAccountId(candidate);
        activeOrgIdRef.current = candidate;
        return candidate;
      }
    }

    const client = createSupabaseClient();
    const { data } = await client.auth.getSession();
    const fetched = await fetchUserOrganizations({
      accessToken: data.session?.access_token,
    });
    const sanitizedFetched = fetched
      .map((org) => {
        const normalized = normalizeOrgId(org.id);
        if (!normalized) return null;
        return { ...org, id: normalized };
      })
      .filter((org): org is UserOrganization => Boolean(org));
    setOrganizations(sanitizedFetched);
    const first = sanitizedFetched[0];
    if (first) {
      setAccountId(first.id);
      activeOrgIdRef.current = first.id;
      return first.id;
    }
    return null;
  }, [accountId, organizations, setAccountId]);

  const notifySessionExpired = useCallback(() => {
    if (sessionErrorNotifiedRef.current) {
      return;
    }
    sessionErrorNotifiedRef.current = true;
    toast.error(
      "Your session has expired. Please sign in again to manage strategy drafts.",
    );
  }, []);

  useEffect(() => {
    try {
      const client = createSupabaseClient();
      supabaseRef.current = client;
      void (async () => {
        const result = await client.auth.getUser();
        const userId = result.data?.user?.id;
        if (userId) {
          setOwnerUserId(userId);
        }
      })();
    } catch (error) {
      logger.warn("strategy_builder_supabase_unavailable", error);
    }
  }, []);

  const ensureBackendSession = useCallback((): Promise<boolean> => {
    if (sessionSyncRef.current) {
      return sessionSyncRef.current;
    }

    let client = supabaseRef.current;
    if (!client) {
      try {
        client = createSupabaseClient();
        supabaseRef.current = client;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          logger.warn("strategy_builder_supabase_client_init_failed", error);
        }
        return Promise.resolve(false);
      }
    }

    const attempt = (async () => {
      try {
        const sessionResponse = await client.auth.getSession();
        if (sessionResponse.error) {
          if (process.env.NODE_ENV !== "production") {
            logger.warn(
              "strategy_builder_session_fetch_failed",
              sessionResponse.error,
            );
          }
          return false;
        }
        const accessToken = sessionResponse.data.session?.access_token ?? null;
        if (!accessToken) {
          return false;
        }
        await syncBackendSessions(accessToken);
        sessionErrorNotifiedRef.current = false;
        return true;
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          logger.warn("strategy_builder_session_sync_failed", error);
        }
        return false;
      }
    })();

    sessionSyncRef.current = attempt;
    attempt.finally(() => {
      if (sessionSyncRef.current === attempt) {
        sessionSyncRef.current = null;
      }
    });

    return attempt;
  }, []);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      let attempt = 0;
      while (attempt < 2) {
        const client = supabaseRef.current ?? createSupabaseClient();
        if (!supabaseRef.current) supabaseRef.current = client;
        const { data } = await client.auth.getSession();
        const token = data.session?.access_token;

        // Fix: Properly include headers
        const headers: Record<string, string> = {
          ...((init?.headers as Record<string, string>) || {}),
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const options: RequestInit = {
          ...(init ?? {}),
          headers,
          credentials: init?.credentials ?? "include",
        };
        const response = await fetch(input, options);
        if (response.status === 401 && attempt === 0) {
          const recovered = await ensureBackendSession();
          if (recovered) {
            attempt += 1;
            continue;
          }
        }
        return response;
      }
      return fetch(input, init);
    },
    [ensureBackendSession],
  );

  useEffect(() => {
    const client = supabaseRef.current;
    if (!client || !ownerUserId) {
      return;
    }

    const channel = client
      .channel(`strategy-drafts:${ownerUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_strategy_draft",
          filter: `owner_user_id=eq.${ownerUserId}`,
        },
        (payload: RealtimePostgresChangesPayload<ApiDraftRow>) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (deletedId) {
              removeDraft(deletedId);
            }
            return;
          }

          const row = payload.new as ApiDraftRow | null;
          if (!row) return;
          const mapped = mapApiDraft(row);
          upsertDraft(mapped, payload.eventType === "INSERT");
          // If the update came from another tab/device, we might want to refresh the UI?
          // We don't want to overhaul the active editor if the user is typing,
          // but react-flow might need syncing if we want real-time colab (not now).

          if (row.id === currentDraftId) {
            setAutoSaveState("saved");
            // We could potentially update lastSnapshot here if we wanted
          }
        },
      )
      .subscribe(
        (status: "CLOSED" | "CHANNEL_ERROR" | "SUBSCRIBED" | "TIMED_OUT") => {
          if (status === "SUBSCRIBED") {
            // setIsRealtimeReady(true);
          }
        },
      );

    return () => {
      // setIsRealtimeReady(false);
      client.removeChannel(channel);
    };
  }, [ownerUserId, removeDraft, upsertDraft, currentDraftId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Update snapshot when draft changes
  useEffect(() => {
    if (!currentDraft) {
      setLastSnapshot(undefined);
      return;
    }
    // We assume currentDraft.workflow contains the reactFlow data now in a "reactFlow" field if present
    // or we might need to parse it.
    // The previous implementation utilized blocklyXml, now we use workflow column primarily for storage.

    // For now, allow simple passthrough
    const wf = currentDraft.workflow;

    setLastSnapshot({
      templateId: currentDraft.templateId,
      blocklyXml: currentDraft.blocklyXml ?? undefined,
      workflow: wf ?? { nodes: [] },
      reactFlow: wf?.reactFlow,
      summary: currentDraft.summary || {
        triggers: [],
        actions: [],
        riskControls: [],
      },
    });
  }, [currentDraft]);

  const queueSave = useCallback(
    (
      draftId: string,
      payload: { name?: string; workflow?: UntypedJson; templateId?: string },
    ) => {
      if (!draftId) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      setAutoSaveState("saving");
      saveTimerRef.current = setTimeout(async () => {
        try {
          const body: Record<string, UntypedJson> = {};
          if (payload.name !== undefined) body.name = payload.name;
          if (payload.templateId !== undefined)
            body.templateId = payload.templateId;

          // Workflow column stores the whole JSON blob including ReactFlow data
          if (payload.workflow !== undefined) body.workflow = payload.workflow;

          if (Object.keys(body).length === 0) {
            setAutoSaveState("idle");
            return;
          }
          const response = await authFetch(
            `/api/strategies/drafts/${draftId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
          );
          if (response.status === 401) {
            notifySessionExpired();
            setAutoSaveState("error");
            return;
          }
          if (!response.ok) {
            throw new Error(await response.text());
          }
          const payloadJson = await response.json();
          const updated = mapApiDraft(payloadJson.draft);
          upsertDraft(updated, true);
          setAutoSaveState("saved");

          // Update snapshot logic if needed
        } catch (error) {
          logger.error("Failed to persist draft", error);
          setAutoSaveState("error");
          toast.error("Failed to save draft changes");
        }
      }, 800);
    },
    [authFetch, notifySessionExpired, upsertDraft],
  );

  const createNewDraft = useCallback(
    async (templateId?: string, options?: { orgId?: string }) => {
      try {
        const orgId =
          options?.orgId ?? activeOrgIdRef.current ?? (await ensureOrgId());
        // For now preventing templates since they are blockly-based
        // const template = templateId ? getTemplate(templateId) : undefined;

        const response = await authFetch("/api/strategies/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(orgId ? { orgId } : {}),
            name: "New Strategy",
            prompt: "",
            templateId: undefined,
            workflow: {
              reactFlow: { nodes: initialNodes, edges: [] },
              agnosticWorkflow: { nodes: [] },
            },
          }),
        });
        if (response.status === 401) {
          notifySessionExpired();
          return;
        }
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const payload = await response.json();
        const draft = mapApiDraft(payload.draft);
        upsertDraft(draft, true);
        setCurrentDraft(draft.id);
        setEditorKey((k) => k + 1);
        setAutoSaveState("saved");
      } catch (error) {
        logger.error("Failed to create draft", error);
        toast.error("Unable to create draft");
      }
    },
    [
      authFetch,
      ensureOrgId,
      notifySessionExpired,
      upsertDraft,
      setCurrentDraft,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadDrafts() {
      try {
        setIsLoading(true);
        const response = await authFetch("/api/strategies/drafts", {
          cache: "no-store",
        });
        if (response.status === 401) {
          notifySessionExpired();
          hydrateDrafts([]);
          return;
        }
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const payload = await response.json();
        if (cancelled) return;
        const remoteDrafts: StrategyDraft[] = Array.isArray(payload?.drafts)
          ? payload.drafts.map(mapApiDraft)
          : [];
        if (remoteDrafts.length) {
          hydrateDrafts(remoteDrafts);
        }

        await queueInitialSelection(remoteDrafts);
      } catch (error) {
        logger.error("Failed to load strategy drafts", error);
        await queueInitialSelection([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    async function queueInitialSelection(loadedDrafts: StrategyDraft[]) {
      if (!loadedDrafts.length) {
        const orgId = await ensureOrgId();
        if (orgId) {
          await createNewDraft(undefined, { orgId });
        } else {
          // Just stop loading if no org
          setIsLoading(false);
        }
        return;
      }

      const targetDraftId = draftParam ?? loadedDrafts[0]?.id;
      if (targetDraftId) {
        setCurrentDraft(targetDraftId);
        setEditorKey((k) => k + 1);
      }
    }

    loadDrafts();
    return () => {
      cancelled = true;
    };
  }, [
    authFetch,
    createNewDraft,
    draftParam,
    ensureOrgId,
    hydrateDrafts,
    notifySessionExpired,
    setCurrentDraft,
  ]);

  const handleNameChange = useCallback(
    (value: string) => {
      if (!currentDraft) return;
      updateDraft(currentDraft.id, { name: value });
      queueSave(currentDraft.id, { name: value });
    },
    [currentDraft, queueSave, updateDraft],
  );

  const handleFlowSave = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (!currentDraft) return;

      // Construct the payload
      const workflowData = {
        reactFlow: { nodes, edges },
        nodes: [], // Agnostic nodes structure required by StrategyWorkflow
      };

      // Optimistic update
      updateDraft(currentDraft.id, { workflow: workflowData });

      // Server save
      queueSave(currentDraft.id, { workflow: workflowData });
    },
    [currentDraft, queueSave, updateDraft],
  );

  const handleDeleteDraft = useCallback(
    async (draftId: string) => {
      try {
        const response = await authFetch(`/api/strategies/drafts/${draftId}`, {
          method: "DELETE",
        });
        if (response.status === 401) {
          notifySessionExpired();
          return;
        }
        if (!response.ok) {
          throw new Error(await response.text());
        }
        removeDraft(draftId);
        setEditorKey((key) => key + 1);
        setAutoSaveState("idle");
      } catch (error) {
        logger.error("Failed to delete draft", error);
        toast.error("Unable to delete draft");
      }
    },
    [authFetch, notifySessionExpired, removeDraft],
  );

  const handlePublishToWizard = useCallback(() => {
    if (!currentDraft) {
      toast.error("Create a strategy draft first");
      return;
    }
    // Just persist whatever we have
    const snapshot = lastSnapshot;
    if (snapshot) {
      try {
        const payload = { id: currentDraft.id, snapshot };
        sessionStorage.setItem(
          `strategy-draft:${currentDraft.id}`,
          JSON.stringify(payload),
        );
      } catch (error) {
        logger.warn("Unable to persist snapshot into session storage", error);
      }
    }
    router.push(`/agents/new?draft=${encodeURIComponent(currentDraft.id)}`);
  }, [currentDraft, lastSnapshot, router]);

  if (!currentDraft || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading strategy builder...</p>
        </div>
      </div>
    );
  }

  // Safely extract initial props
  const wf = currentDraft.workflow;
  const initialNodesState = wf?.reactFlow?.nodes;
  const initialEdgesState = wf?.reactFlow?.edges;

  return (
    <div className="relative flex h-[623px] w-full flex-row items-stretch border-t border-[var(--settings-border-soft)]">
      {/* Sidebar Area */}
      <aside className="relative flex w-[288px] shrink-0 flex-col border-r border-[var(--settings-border-soft)] py-5">
        <StrategyDraftList
          drafts={drafts}
          activeDraftId={currentDraft.id}
          onSelect={(id) => {
            setCurrentDraft(id);
            setEditorKey((key) => key + 1);
          }}
          onDelete={handleDeleteDraft}
          onCreate={() => {
            void createNewDraft();
          }}
        />

        {/* Auto-save Indicator positioned at bottom of sidebar or just below list as per screenshot */}
        <div className="mt-auto px-4">
          <div className="flex items-center justify-between py-3">
            <span className="font-inter text-[11.6px] uppercase tracking-[0.3px] text-[var(--settings-foreground-subtle)]">
              Auto-save
            </span>
            <Badge
              variant="outline"
              className={cn(
                "font-inter h-[22px] rounded-lg border px-2 py-0.5 text-[12px] font-medium capitalize",
                autoSaveTone(autoSaveState),
              )}
            >
              {autoSaveState === "saving" && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              {autoSaveState === "saved"
                ? "Saved"
                : autoSaveState === "error"
                  ? "Error"
                  : "Idle"}
            </Badge>
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Optional Header for Canvas Controls - kept minimal or hidden based on 'clean' screenshot */}
        {/* We keep the name input but style it to be very subtle or integrate it into the canvas overlay if needed. 
            For now, placing it inside the canvas area but styled minimally. */}
        <div className="absolute left-6 top-6 z-10 flex gap-4">
          <Input
            value={currentDraft.name}
            onChange={(event) => handleNameChange(event.target.value)}
            className="h-9 w-64 border-[var(--settings-border)] bg-[var(--settings-elevated)] text-sm text-[var(--settings-foreground-strong)] placeholder:text-[var(--settings-foreground-subtle)] focus-visible:ring-1 focus-visible:ring-[var(--settings-border-strong)]"
            placeholder="Strategy Name"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handlePublishToWizard}
            className="h-9"
          >
            <Rocket className="mr-2 h-3 w-3" />
            Wizard
          </Button>
        </div>

        <StrategyFlowEditor
          key={`${currentDraft.id}-${editorKey}`}
          initialNodes={initialNodesState ?? initialNodes}
          initialEdges={initialEdgesState ?? []}
          onSave={handleFlowSave}
        />
      </main>
    </div>
  );
}

function mapApiDraft(row: ApiDraftRow): StrategyDraft {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    prompt: row.prompt ?? "",
    templateId: row.template_id ?? undefined,
    blocklyXml: row.blockly_xml ?? undefined,
    workflow: row.workflow as StrategySnapshot["workflow"] | undefined,
    summary: row.summary as StrategySnapshot["summary"] | undefined,
    createdAt: row.created_at,
    updatedAt: row.last_saved_at ?? row.created_at,
  };
}

function autoSaveTone(state: AutoSaveState) {
  switch (state) {
    case "saving":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    case "saved":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
    case "error":
      // Matching screenshot: Red Orange 10% bg, Bittersweet 40% border, Your Pink text
      return "border-rose-400/40 bg-rose-500/10 text-rose-200";
    default:
      return "border-[var(--settings-border-soft)] bg-[var(--settings-elevated)] text-[var(--settings-foreground-subtle)]";
  }
}
