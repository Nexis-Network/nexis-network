import { createHash } from "crypto";
import { resolveAutomationState } from "@/modules/chat/resolve-automation-state";
import { summarizeAutomationPreferences } from "@/modules/chat/automation-preferences";
import { buildAutomationTelemetry, buildAttachmentTelemetry, mergeTelemetry } from "@/modules/chat/telemetry";
import { buildWalletSnapshotPrompt } from "@/server/profile/profile-aggregate";
import {
    buildChatStartSnapshot,
    type ChatStartSnapshot,
} from "@/server/services/chat/chat-start-snapshot";
import { getCreditBalance } from "@/server/services/credits/credit-service";
import type { ChatAgentRequest, AttachmentFingerprint } from "@/modules/chat/types";
import type { AutomationState } from "@/modules/chat/automation-preferences";
import type { TraceContext } from "@/modules/chat/langfuse-tracing";
import {
    createContextEnvelope,
    hashContextValue,
    type ContextEnvelope,
    type ContextEnvelopeArtifactRef,
} from "@/modules/chat/context-envelope";
import {
    buildMemorySnapshot,
    type MemorySnapshot,
} from "@/modules/chat/state/memory-contract";
import { listArtifactLedgerRecords } from "@/modules/chat/state/artifact-ledger";
import { extractLatestUserMessage } from "@/modules/chat/pipeline/request-normalization";
import { isSyntheticNonProductionTestAuth } from "@/modules/chat/test-mode-auth";


import { logger } from '@/lib/logger';
export type PipelineContext = {
    auth: {
        userId?: string | null;
        accessToken?: string | null;
    };
    username?: string | null;
    /** User's subscription tier (e.g. "free", "pro", "trader", "ultra", "enterprise"). */
    userPlan: string | null;
    automation: {
        state: AutomationState;
        summary: ReturnType<typeof summarizeAutomationPreferences>;
    };
    attachments: {
        fingerprint: AttachmentFingerprint & { count: number };
        sha256: string | null;
    };
    telemetry: Record<string, UntypedJson> | undefined;
    walletSnapshot: string | null;
    chatStartSnapshot: ChatStartSnapshot | null;
    request: ChatAgentRequest;
    agentId: string | null;
    sandboxId: string | null;
    enabledMcpServers: { name: string; env: Record<string, string>; command?: string }[];
    workingMemorySummary: string;
    memorySnapshot: MemorySnapshot;
    artifactRefs: ContextEnvelopeArtifactRef[];
    contextEnvelope: ContextEnvelope;
    traceContext?: TraceContext | null;
};

export type ContextBuilderOptions = {
    skipMemoryFetch?: boolean;
    skipContextEnrichment?: boolean;
};

export class ContextBuilder {
    constructor(
        private readonly request: ChatAgentRequest,
        private readonly auth: { userId?: string | null; accessToken?: string | null },
        private readonly options: ContextBuilderOptions = {}
    ) { }

    async build(): Promise<PipelineContext> {
        const {
            automationPreferences,
            attachmentCount,
            attachmentContext,
            attachmentPromptContexts,
            tierRoute,
        } = this.request;
        const latestUserMessage = this.getLatestUserMessage();
        const turnId = this.buildTurnId();
        const isSyntheticTestAuth = isSyntheticNonProductionTestAuth(this.auth);

        const { skipContextEnrichment = false } = this.options;

        // Fast path: Skip heavy context building for simple queries
        if (skipContextEnrichment) {
            const [automationState, memorySnapshot, artifactRefs] = await Promise.all([
                resolveAutomationState({
                    explicit: automationPreferences ?? null,
                    userId: isSyntheticTestAuth ? null : this.auth.userId ?? null,
                }),
                buildMemorySnapshot({
                    latestUserMessage,
                    sessionId: this.request.sessionId ?? null,
                    userId: this.auth.userId ?? null,
                    skipDurableMemory: true,
                }),
                this.listArtifactRefs(),
            ]);
            const automationSummary = summarizeAutomationPreferences(automationState);
            const attachmentFingerprint = this.computeAttachmentFingerprint({
                count: attachmentCount,
                context: attachmentContext,
                promptContexts: attachmentPromptContexts,
            });
            const contextEnvelope = createContextEnvelope({
                turnId,
                sessionId: this.request.sessionId ?? null,
                userId: this.auth.userId ?? null,
                route: tierRoute ?? "chat",
                profileId: this.request.systemPromptProfileId ?? null,
                memorySnapshot,
                artifactRefs,
                marketContextHash: hashContextValue(this.request.marketContext ?? null),
                sessionSnapshotHash: null,
            });

            return {
                auth: this.auth,
                username: null,
                userPlan: null, // Skipped on fast path — defaults to env vars
                automation: { state: automationState, summary: automationSummary },
                attachments: { fingerprint: attachmentFingerprint, sha256: attachmentFingerprint.sha256 ?? null },
                telemetry: undefined,
                walletSnapshot: null,
                chatStartSnapshot: null,
                request: this.request,
                agentId: this.request.agentId ?? null,
                sandboxId: null, // No persistence on fast path
                enabledMcpServers: [],
                workingMemorySummary: memorySnapshot.summary,
                memorySnapshot,
                artifactRefs,
                contextEnvelope,
                traceContext: null,
            };
        }

        // Standard path: Full context building with parallelization
        const [profile, automationState, sandboxId, mcpConfigs, creditBalance, memorySnapshot, artifactRefs] = await Promise.all([
            // 0. Fetch Profile
            (async () => {
                if (this.auth.accessToken && !isSyntheticTestAuth) {
                    const { fetchRemoteProfileAggregate } = await import("@/server/profile/profile-aggregate");
                    return await fetchRemoteProfileAggregate(this.auth.accessToken);
                }
                return null;
            })(),
            // 1. Resolve Automation State
            resolveAutomationState({
                explicit: automationPreferences ?? null,
                userId: isSyntheticTestAuth ? null : this.auth.userId ?? null,
            }),
            // 2. Fetch Sandbox ID
            (async () => {
                if (this.request.sessionId) {
                    const { getConversationSandboxId } = await import("@/server/services/e2b/sandbox-service");
                    return await getConversationSandboxId(this.request.sessionId);
                }
                return null;
            })(),
            // 3. Fetch Enabled MCP Servers
            (async () => {
                if (!this.auth.accessToken || isSyntheticTestAuth) return [];
                try {
                    const { createClient } = await import("@supabase/supabase-js");
                    const { McpService } = await import("@/lib/mcp/mcp-service");
                    
                    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
                    const supabase = createClient(url, anonKey, {
                        global: { headers: { Authorization: `Bearer ${this.auth.accessToken}` } }
                    });
                    
                    const configs = await McpService.getUserConfigs(supabase);
                    return await Promise.all(configs.filter(c => c.enabled).map(async c => {
                         let command = undefined;
                         if (c.mcp_registry?.sre_url) {
                             try {
                                 const src = JSON.parse(c.mcp_registry.sre_url);
                                 if (src.type === 'npm' && src.location) {
                                     command = `npx -y ${src.location}`;
                                 }
                             } catch {}
                         }

                         let envMap = (c.config_overrides) || {};
                         // Decrypt if necessary
                         // Check for our encrypted wrapper format { encrypted: "..." }
                         if (envMap.encrypted && typeof envMap.encrypted === 'string') {
                             try {
                                 // Import dynamically to avoid top-level server module issues if this file is imported loosely
                                 const { decrypt } = await import("@/lib/server/encryption");
                                 const decryptedJson = decrypt(envMap.encrypted);
                                 envMap = JSON.parse(decryptedJson);
                             } catch (err) {
                                 logger.error(`Failed to decrypt config for ${c.mcp_registry?.name}`, err);
                                 envMap = {}; // Fallback to empty context on error
                             }
                         }

                         return {
                             name: c.mcp_registry?.name || "unknown",
                             env: envMap,
                             command
                         };
                    }));
                } catch (e) {
                    logger.error("Failed to load MCP configs", e);
                    return [];
                }
            })(),
            // 4. Fetch Credit Balance (for user plan / tier-aware budgets)
            (async () => {
                if (!this.auth.userId || isSyntheticTestAuth) return null;
                try {
                    return await getCreditBalance(this.auth.userId);
                } catch (e) {
                    logger.error("[ContextBuilder] getCreditBalance failed, defaulting to free tier", e);
                    return null;
                }
            })(),
            // 5. Build shared memory snapshot for prompting, router context, and workflow state
            buildMemorySnapshot({
                latestUserMessage,
                sessionId: this.request.sessionId ?? null,
                userId: this.auth.userId ?? null,
            }),
            // 6. Pull recent artifact refs for replay/resume context
            this.listArtifactRefs(),
        ]);

        const automationSummary = summarizeAutomationPreferences(automationState);

        // 2. Compute Attachment Fingerprint
        const attachmentFingerprint = this.computeAttachmentFingerprint({
            count: attachmentCount,
            context: attachmentContext,
            promptContexts: attachmentPromptContexts,
        });

        // 3. Build Telemetry
        const telemetryMetadata = mergeTelemetry(
            buildAutomationTelemetry(automationSummary),
            buildAttachmentTelemetry(attachmentFingerprint),
            tierRoute ? { routing_route: tierRoute } : undefined
        );

        // 4. Build Wallet Snapshot (Depends on Profile)
        const [walletSnapshotSegment, chatStartSnapshot] = await Promise.all([
            isSyntheticTestAuth
                ? Promise.resolve(null)
                : buildWalletSnapshotPrompt({
                    accessToken: this.auth.accessToken ?? null,
                    userId: this.auth.userId ?? null,
                    profile,
                }),
            isSyntheticTestAuth
                ? Promise.resolve(null)
                : buildChatStartSnapshot({
                    sessionId: this.request.sessionId ?? null,
                    userId: this.auth.userId ?? null,
                    profile,
                    request: this.request,
                }).catch((error) => {
                    logger.warn("[ContextBuilder] buildChatStartSnapshot failed", error);
                    return null;
                }),
        ]);
        const contextEnvelope = createContextEnvelope({
            turnId,
            sessionId: this.request.sessionId ?? null,
            userId: this.auth.userId ?? null,
            route: tierRoute ?? "chat",
            profileId: this.request.systemPromptProfileId ?? null,
            memorySnapshot,
            artifactRefs,
            marketContextHash: hashContextValue(this.request.marketContext ?? null),
            sessionSnapshotHash: hashContextValue(chatStartSnapshot?.promptContext ?? null),
        });

        return {
            auth: this.auth,
            username: profile?.identity?.username || profile?.identity?.displayName || null,
            userPlan: creditBalance?.plan ?? null,
            automation: {
                state: automationState,
                summary: automationSummary,
            },
            attachments: {
                fingerprint: attachmentFingerprint,
                sha256: attachmentFingerprint.sha256 ?? null,
            },
            telemetry: telemetryMetadata,
            walletSnapshot: walletSnapshotSegment,
            chatStartSnapshot,
            request: this.request,
            agentId: this.request.agentId ?? null,
            sandboxId,
            enabledMcpServers: mcpConfigs,
            workingMemorySummary: memorySnapshot.summary,
            memorySnapshot,
            artifactRefs,
            contextEnvelope,
            traceContext: null,
        };
    }

    private getLatestUserMessage(): string {
        return extractLatestUserMessage(this.request.messages);
    }

    private buildTurnId(): string {
        const explicitId = this.request.submissionId ?? this.request.sessionId;
        if (explicitId && explicitId.trim().length > 0) {
            return explicitId.trim();
        }

        return (
            hashContextValue({
                messages: this.request.messages,
                model: this.request.model ?? null,
                profile: this.request.systemPromptProfileId ?? null,
            })?.slice(0, 24) ?? "turn"
        );
    }

    private async listArtifactRefs(): Promise<ContextEnvelopeArtifactRef[]> {
        const records = await listArtifactLedgerRecords({
            sessionId: this.request.sessionId ?? null,
            userId: this.auth.userId ?? null,
            limit: 8,
        });

        return records.map((record) => ({
            artifactId: record.artifactId,
            artifactType: record.artifactType,
            title: record.title ?? null,
            previewUrl: record.previewUrl ?? null,
            provenance: record.provenance,
            snapshotVersion: record.snapshotVersion,
            relatedToolCalls: record.relatedToolCalls.map((tool) => tool.name),
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        }));
    }

    private computeAttachmentFingerprint({
        count,
        context,
        promptContexts,
    }: {
        count?: number | null;
        context?: string | null;
        promptContexts?: string[] | null;
    }): AttachmentFingerprint & { count: number } {
        const normalizedCount = typeof count === "number" ? count : promptContexts?.length ?? 0;
        if (!context && (!promptContexts || promptContexts.length === 0)) {
            return {
                sha256: null,
                hasAttachmentTelemetry: false,
                count: normalizedCount,
            };
        }
        const hash = createHash("sha256");
        if (context) {
            hash.update(context);
        }
        (promptContexts ?? []).forEach((segment) => {
            hash.update(segment);
        });
        return {
            sha256: hash.digest("hex"),
            hasAttachmentTelemetry: true,
            count: normalizedCount,
        };
    }
}
